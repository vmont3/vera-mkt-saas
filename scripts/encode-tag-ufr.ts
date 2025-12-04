import { UfrNfcHardwareDriver } from '../src/modules/tag-encoding/driver/UfrNfcHardwareDriver';
import { Ntag424Encoder, Ntag424EncoderConfig } from '../src/modules/tag-encoding/encoder/Ntag424Encoder';
import { KmsClient } from '../src/modules/tag-encoding/infra/KmsClient';
import { TagEncodingJob } from '../src/modules/tag-encoding/domain/TagEncodingTypes';
import crypto from 'crypto';

// Mock KMS Client for testing
class MockKmsClient implements KmsClient {
    private keys: { [key: string]: Buffer };

    constructor() {
        // Generate random keys for testing
        this.keys = {
            kApp: crypto.randomBytes(16),
            kSdm: crypto.randomBytes(16),
            kNdef: crypto.randomBytes(16),
            kProt: crypto.randomBytes(16),
            kAuthHost: crypto.randomBytes(16)
        };

        console.log('🔑 Mock KMS Keys generated:');
        console.log(`   K_APP: ${this.keys.kApp.toString('hex').toUpperCase()}`);
        console.log(`   K_SDM: ${this.keys.kSdm.toString('hex').toUpperCase()}`);
    }

    async getAppKey(): Promise<Buffer> { return this.keys.kApp; }
    async getSdmKey(): Promise<Buffer> { return this.keys.kSdm; }
    async getNdefKey(): Promise<Buffer> { return this.keys.kNdef; }
    async getProtKey(): Promise<Buffer> { return this.keys.kProt; }
    async getAuthHostKey(): Promise<Buffer> { return this.keys.kAuthHost; }

    // Unused methods for encoding
    async encrypt(data: Buffer): Promise<Buffer> { return data; }
    async decrypt(data: Buffer): Promise<Buffer> { return data; }
    async generateMac(data: Buffer): Promise<Buffer> { return Buffer.alloc(8); }
}

async function runEncodingTest() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  TESTE DE GRAVAÇÃO REAL - NTAG 424 DNA (µFR Driver)   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const driver = new UfrNfcHardwareDriver();
    const kms = new MockKmsClient();

    const config: Ntag424EncoderConfig = {
        ccSize: 32,
        ndefSize: 256,
        protectedSize: 128
    };

    const encoder = new Ntag424Encoder(driver, kms, config);

    // Create a dummy job
    const job: TagEncodingJob = {
        id: `test-job-${Date.now()}`,
        assetId: 'asset-test-001',
        tagInternalId: crypto.randomUUID(),
        urlBase: 'https://verify.quantumcert.com/v1/verify',

        // Standard Quantum Cert SDM Offsets (based on URL length)
        // URL: https://verify.quantumcert.com/v1/verify?d={SDMENC}&r={SDMReadCtr}&m={SDMMAC}
        // Base length: ~40 chars
        // P = 0 (start)
        // We need to calculate offsets based on the full URL template constructed in NdefBuilder
        // For this test, we use approximate values, but in real flow NdefBuilder handles this.
        // Actually, Ntag424Encoder uses these values to configure the tag.
        // Let's use standard values for a typical URL.
        sdmEncOffset: 64,  // Example offset
        sdmEncLength: 64,
        sdmReadCtrOffset: 150,
        sdmMacOffset: 160,
        sdmMacInputOffset: 64
    };

    try {
        console.log('1. Inicializando driver...');
        await driver.initialize();

        console.log('\n2. Executando encode()...');
        console.log('⚠️  APROXIME UMA TAG NTAG 424 DNA AGORA!');

        const result = await encoder.encode(job);

        console.log('\n✅ SUCESSO! Tag gravada.');
        console.log(`   UID: ${result.uid}`);

    } catch (error: any) {
        console.error('\n❌ FALHA:', error.message);
        if (error.message.includes('uFCoder')) {
            console.log('   Verifique se o leitor está conectado e a biblioteca instalada.');
        }
    } finally {
        try {
            await driver.close();
        } catch { }
    }
}

runEncodingTest().catch(console.error);
