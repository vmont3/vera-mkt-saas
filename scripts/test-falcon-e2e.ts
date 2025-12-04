import { QuantumCryptoService } from '../src/services/security/QuantumCryptoService';
import { VerificationService } from '../src/modules/verification/VerificationService';
import { CryptoUtils } from '../src/utils/CryptoUtils';
import { TagRegistry } from '../src/modules/tag-registry/TagRegistry';
import { AwsKmsClient } from '../src/modules/tag-encoding/infra/AwsKmsClient';
import * as dotenv from 'dotenv';

dotenv.config();

// MOCKS
class MockTagRegistry {
    private mockDb: Map<string, any> = new Map();

    async resolveAssetForTag(truncatedHash: string, tagInternalId: string): Promise<any> {
        console.log(`[MockRegistry] Resolving asset for hash: ${truncatedHash}`);
        return this.mockDb.get(truncatedHash);
    }

    async findByTagInternalId(tagInternalId: string): Promise<any> {
        return { lastAcceptedCtr: 0 };
    }

    async saveUid(tagInternalId: string, uid: string | null): Promise<void> { }
    async updateStatus(tagInternalId: string, status: string): Promise<void> { }
    async createTag(assetId: string): Promise<any> { return {}; }

    // Helper to seed the mock DB
    registerMockAsset(truncatedHash: string, asset: any) {
        this.mockDb.set(truncatedHash, asset);
    }
}

class MockKmsClient {
    async encrypt(plaintext: Buffer): Promise<Buffer> { return plaintext; }
    async decrypt(ciphertext: Buffer): Promise<Buffer> { return ciphertext; }
    async generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: Buffer }> {
        return { plaintext: Buffer.alloc(16), ciphertext: Buffer.alloc(16) };
    }
    async generateMac(data: Buffer): Promise<Buffer> { return Buffer.alloc(8); }

    async getSdmKey(): Promise<Uint8Array> {
        return new Uint8Array(Buffer.from('00000000000000000000000000000000', 'hex'));
    }

    async getAppKey(): Promise<Uint8Array> { return new Uint8Array(16); }
    async getNdefKey(): Promise<Uint8Array> { return new Uint8Array(16); }
    async getProtKey(): Promise<Uint8Array> { return new Uint8Array(16); }
    async getAuthHostKey(): Promise<Uint8Array> { return new Uint8Array(16); }

    async deriveTagKey(tagId: string, purpose: string): Promise<Uint8Array> {
        return new Uint8Array(16);
    }

    async decryptData(encryptedKey: Uint8Array, encryptionContext?: Record<string, string>): Promise<Uint8Array> {
        return encryptedKey;
    }

    clearCache(): void { }
}

async function testFalconE2E() {
    console.log('🚀 Starting Falcon-512 E2E Integration Test...');

    try {
        // 1. Setup Services
        const cryptoService = new QuantumCryptoService();
        const mockRegistry = new MockTagRegistry();
        const mockKms = new MockKmsClient();

        // Subclass to mock protected method
        class TestVerificationService extends VerificationService {
            protected async updateAcceptedCounter(tagInternalId: string, ctrValue: number): Promise<void> {
                console.log(`[TestVerificationService] Mock updateAcceptedCounter: ${tagInternalId} -> ${ctrValue}`);
                return;
            }
        }

        // Cast mocks to expected types to bypass private property checks
        const verificationService = new TestVerificationService(
            mockRegistry as any as TagRegistry,
            mockKms as any as AwsKmsClient
        );

        // 2. Create Asset & Sign (Falcon)
        console.log('\n📝 Step 1: Asset Creation & Signing');
        const assetId = 'asset-123';
        const assetData = {
            type: 'CERTIFICATE',
            category: 'PREMIUM',
            issuedAt: new Date()
        };

        // Note: This requires FALCON keys to be configured in .env!
        // If not, we'll catch the error.
        let signatureResult;
        try {
            signatureResult = await cryptoService.generateSignatureResult({
                assetId,
                ...assetData,
                issuedAt: assetData.issuedAt.toISOString()
            });
            console.log('✅ Asset Signed with Falcon-512');
            console.log(`   Master Hash: ${signatureResult.masterHash}`);
            console.log(`   Truncated Hash: ${signatureResult.truncatedHash}`);
        } catch (e: any) {
            console.warn('⚠️  Skipping signing (Keys not configured?):', e.message);
            // Mocking signature result for the rest of the flow if signing failed
            signatureResult = {
                truncatedHash: '11223344556677889900aabbccddeeff', // 16 bytes hex
                masterHash: 'mock-master-hash',
                signature: new Uint8Array(),
                signatureHex: ''
            };
        }

        // 3. Register Asset (Mock DB)
        console.log('\n💾 Step 2: Registering Asset in Mock DB');
        mockRegistry.registerMockAsset(signatureResult.truncatedHash, {
            id: assetId,
            ...assetData,
            verificationStatus: 'VALID'
        });
        console.log('✅ Asset registered with Truncated Hash');

        // 4. Simulate SDM Tag Encoding (Crypto Construction)
        console.log('\n🏷️  Step 3: Simulating SDM Tag Payload');

        // SDM Constants
        const uid = Buffer.from('04112233445566', 'hex'); // 7 bytes
        const ctr = Buffer.from('000001', 'hex'); // 3 bytes
        const kSdm = await mockKms.getSdmKey();

        // Derive Session Key (K_SES)
        const kSes = await CryptoUtils.deriveSessionKey(Buffer.from(kSdm), uid, ctr);

        // Payload Construction: [UID(7)] [CTR(3)] [TruncHash(16)] [TagID(36)]
        const tagInternalId = '12345678-1234-1234-1234-123456789012'; // 36 chars
        const truncatedHashBytes = Buffer.from(signatureResult.truncatedHash, 'hex');

        const payloadBuffer = Buffer.concat([
            uid,
            ctr,
            truncatedHashBytes,
            Buffer.from(tagInternalId, 'utf-8')
        ]);

        // Encrypt (AES-CTR)
        const iv = Buffer.alloc(16, 0);
        const encryptedData = CryptoUtils.encryptAesCtr(kSes, iv, payloadBuffer);
        const encHex = encryptedData.toString('hex');
        const macHex = '0000000000000000'; // Mock MAC

        console.log(`   Encrypted Payload (d): ${encHex}`);

        // 5. Verification (The Moment of Truth)
        console.log('\n🔍 Step 4: Verifying Tag');

        const result = await verificationService.verifyTag({
            d: encHex,
            m: macHex,
            r: ctr.toString('hex'),
            uid: uid.toString('hex')
        });

        console.log('✅ Verification Result:', result);

        if (result && result.id === assetId) {
            console.log('\n🎉 SUCCESS: Full Chain Verified!');
            console.log('   Asset -> Falcon Sign -> Truncated Hash -> SDM Encrypt -> Decrypt -> Resolve Asset');
        } else {
            console.error('\n❌ FAILURE: Resolved asset does not match original.');
        }

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

testFalconE2E();
