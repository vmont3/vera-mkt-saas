import { QuantumCryptoService } from '../security/QuantumCryptoService';
import { HashService } from '../security/HashService';
import { AWSKMSService } from '../security/AWSKMSService';
import { TagRepository } from '../../repositories/TagRepository';
import { ConfigRepository } from '../../repositories/ConfigRepository';
import { EncoderQueueRepository } from '../../repositories/EncoderQueueRepository';

/**
 * TagRegistryService - Manages NTAG 424 DNA tag registration and asset linking
 * 
 * Phase 3 implementation:
 * - Asset registration with Falcon master hash generation
 * - Tag configuration generation (keys via AWS KMS)
 * - Tag-to-asset linking
 */
export class TagRegistryService {
    private quantumCrypto: QuantumCryptoService;
    private hashService: HashService;
    private kmsService: AWSKMSService;
    private tagRepository: TagRepository;
    private configRepository: ConfigRepository;
    private encoderQueueRepository: EncoderQueueRepository;

    constructor() {
        this.quantumCrypto = new QuantumCryptoService();
        this.hashService = new HashService();
        this.kmsService = new AWSKMSService();
        this.tagRepository = new TagRepository();
        this.configRepository = new ConfigRepository();
        this.encoderQueueRepository = new EncoderQueueRepository();
    }

    /**
     * Register a new asset with Falcon master hash generation
     * 
     * Real Falcon-512 Flow:
     * 1. Build canonical payload from asset data
     * 2. Sign with Falcon-512 system master key
     * 3. Generate master hash = SHA-256(signature)
     * 4. Truncate hash to 128 bits for tag storage
     * 5. Store falconMasterHash, falconPublicKey, truncatedHash
     * 
     * @param assetData Asset details
     * @returns Created asset with hash references and Falcon signature
     */
    async registerAsset(assetData: {
        type: string;
        category?: string;
        ownerId?: string;
        metadata?: any;
        linkedSubjectId?: string;
        partnerAssetId?: string;
    }) {
        // Generate temporary asset ID (will be replaced with DB ID)
        const tempAssetId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Get Falcon signature result (includes master hash and truncated hash)
        const falconResult = await this.quantumCrypto.generateSignatureResult({
            assetId: tempAssetId,
            type: assetData.type,
            category: assetData.category,
            issuedAt: new Date().toISOString(),
            metadata: assetData.metadata,
        });

        // Get system-wide Falcon public key
        const falconPublicKey = this.quantumCrypto.getPublicKeyHex();

        console.log('✅ Falcon-512 signature generated for asset');
        console.log(`   Master Hash: ${falconResult.masterHash.substring(0, 32)}...`);
        console.log(`   Truncated Hash (128 bits): ${falconResult.truncatedHash}`);
        console.log(`   Signature Length: ${falconResult.signature.length} bytes`);

        return {
            // Falcon Cryptography
            falconMasterHash: falconResult.masterHash,
            falconSignature: falconResult.signatureHex,
            falconPublicKey: falconPublicKey,

            // Legacy fields (for backward compatibility)
            masterHashVaultKey: falconResult.masterHash, // Store full hash as vault key
            hashTruncated: falconResult.truncatedHash,

            // Asset data
            assetData,
        };
    }

    /**
     * Generate complete NTAG 424 DNA configuration with AWS KMS keys
     * Enforces strict key mapping:
     * Key 0: K_APP (Admin)
     * Key 1: K_SDM (SDM Read/MAC)
     * Key 2: K_NDEF (NDEF Write)
     * Key 3: K_PROT (Protected File)
     * Key 4: K_AUTH_HOST (Mutual Auth)
     */
    async generateTagConfig(description: string) {
        // Generate unique config ID
        const configId = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Generate keys via AWS KMS with specific roles
        // In a real scenario, we would request specific key types/policies for each role
        const keys = await this.kmsService.generateNTAG424KeySet(configId, description);

        // Define SDM URL template
        // https://api.quantumcert.com/v1/verify-tag?d={SDMENC}&r={SDMReadCtr}&m={SDMMAC}&tid={TagInternalID}
        // We add tid (Tag Internal ID) to allow O(1) lookup during verification instead of O(N) trial decryption.
        const sdmUrlTemplate = 'https://api.quantumcert.com/v1/verify-tag?d={SDMENC}&r={SDMReadCtr}&m={SDMMAC}&tid={TagInternalID}';

        // Calculate offsets based on URL structure
        // Base URL: https://api.quantumcert.com/v1/verify-tag?d= (47 chars)
        // SDMENC (64 chars)
        // &r= (3 chars)
        // SDMReadCtr (6 chars placeholder)
        // &m= (3 chars)
        // SDMMAC (16 chars)
        // &tid= (5 chars)
        // TagInternalID (UUID = 36 chars)

        // Total Estimated Length: 47 + 64 + 3 + 6 + 3 + 16 + 5 + 36 = 180 chars
        // NDEF File Size is 256 bytes, so it fits.

        // Offsets:
        // SDMENC starts at 47.
        // SDMReadCtr starts at 47 + 64 + 3 = 114.
        // SDMMAC starts at 114 + 6 + 3 = 123.
        // MAC Input Offset: Usually starts at the beginning of the ciphertext or specific to mirroring.
        // For NTAG 424 DNA, MAC is calculated over the ASCII string from sdmMacInputOffset to the end of MAC placeholder?
        // No, it's calculated over the data specified by the offset.
        // We usually mirror UID+Ctr+Data.

        // Let's stick to the previous offsets but adjust for the new template if needed.
        // Actually, the template string is just for the Encoder to know WHERE to put things.
        // The *offsets* passed to the tag configuration determine where the tag writes dynamic data.
        // If we append &tid=..., it doesn't affect the offsets of d, r, m if they come BEFORE it.


        const config = await this.configRepository.create({
            // Key Mapping
            keyAppSecretArn: keys.keyAppSecretArn,   // Key 0
            keySdmSecretArn: keys.keySdmSecretArn,   // Key 1
            keyNdefSecretArn: keys.keyNdefSecretArn, // Key 2
            keyProtSecretArn: keys.keyProtSecretArn, // Key 3
            keyAuthSecretArn: keys.keyAuthSecretArn, // Key 4

            // Tag Features
            randomIdEnabled: true,
            lrpModeEnabled: true,

            // SDM Configuration
            sdmUrlTemplate,
            sdmEncOffset: 47,      // Placeholder
            sdmEncLength: 64,      // 64 bytes for UID+Ctr+Hash+InternalID+Meta
            sdmReadCtrOffset: 178, // 47 + 128 (hex) + 3
            sdmMacOffset: 187,     // 178 + 6 + 3
            sdmMacInputOffset: 47, // MAC calculated over ciphertext + ctr

            // File Sizes
            ndefFileSize: 256,     // File E104
            protFileSize: 128,     // File E105

            description,
        });

        return config;
    }

    /**
     * Link a TAG to an asset (after physical encoding)
     * NOW STORES FALCON-512 CRYPTOGRAPHY DATA
     * 
     * @param uid Tag UID (read from physical tag)
     * @param configId NTAG424Config ID
     * @param masterHashVaultKey Falcon master hash (full SHA-256)
     * @param hashTruncated Truncated hash (128 bits)
     * @param falconMasterHash Full Falcon master hash
     * @param falconSignature Falcon signature (hex)
     * @param falconPublicKey Falcon public key (hex)
     * @param linkedSubjectId Optional Subject ID
     * @param partnerAssetId Optional PartnerAsset ID
     * @returns Created NTAG424Tag
     */
    async linkTagToAsset(params: {
        uid: string;
        configId: string;
        masterHashVaultKey: string;
        hashTruncated: string;
        falconMasterHash?: string;
        falconSignature?: string;
        falconPublicKey?: string;
        linkedSubjectId?: string;
        partnerAssetId?: string;
        encodedBy?: string;
        encoderStationId?: string;
    }) {
        const tag = await this.tagRepository.create({
            uid: params.uid,
            config: { connect: { id: params.configId } },

            // Falcon-512 Post-Quantum Cryptography
            falconMasterHash: params.falconMasterHash,
            falconSignature: params.falconSignature,
            falconPublicKey: params.falconPublicKey,

            masterHashVaultKey: params.masterHashVaultKey,
            hashTruncated: params.hashTruncated,
            truncatedBits: 128,

            linkedSubject: params.linkedSubjectId ? { connect: { id: params.linkedSubjectId } } : undefined,
            partnerAsset: params.partnerAssetId ? { connect: { id: params.partnerAssetId } } : undefined,

            status: 'ACTIVE', // Tag is now encoded and active

            encodedAt: new Date(),
            encodedBy: params.encodedBy,
            encoderStation: params.encoderStationId ? { connect: { id: params.encoderStationId } } : undefined,
        });

        console.log('✅ Tag linked to asset with Falcon-512 cryptography');
        if (params.falconMasterHash) {
            console.log(`   Falcon Master Hash: ${params.falconMasterHash.substring(0, 32)}...`);
        }

        return tag;
    }

    /**
     * Complete asset registration + tag config generation workflow
     * This prepares everything needed for physical encoding
     * 
     * NOW WITH REAL FALCON-512 AND ALGORAND ANCHORING:
     * - Generates Falcon signature for asset
     * - Stores master hash, signature, and public key
     * - Feeds truncated hash into SDMENC payload
     * - Anchors the Falcon master hash to Algorand
     */
    async prepareAssetForEncoding(params: {
        assetType: string;
        assetCategory?: string;
        linkedSubjectId?: string;
        partnerAssetId?: string;
        configDescription: string;
        operatorId?: string;
        stationId?: string;
    }) {
        // Step 1: Register asset and generate Falcon signature
        const assetReg = await this.registerAsset({
            type: params.assetType,
            category: params.assetCategory,
            linkedSubjectId: params.linkedSubjectId,
            partnerAssetId: params.partnerAssetId,
        });

        console.log('🔐 Asset registered with Falcon-512 cryptography');

        // Step 1.5: Anchor to Algorand (if we have a stable Asset ID)
        if (params.partnerAssetId) {
            try {
                const { AlgorandAnchorService } = await import('../blockchain/AlgorandAnchorService');
                const anchorService = new AlgorandAnchorService();
                await anchorService.anchorAsset(params.partnerAssetId, assetReg.falconMasterHash);
                const { AuditLogService } = await import('../audit/AuditLogService');
                const auditService = new AuditLogService();

                await auditService.log({
                    eventType: 'ANCHORING_FAILED',
                    severity: 'WARNING',
                    actorType: 'SYSTEM',
                    actorId: 'TagRegistryService',
                    assetId: params.partnerAssetId,
                    payload: {
                        error: 'Anchoring failed (logged internally)',
                        falconHash: assetReg.falconMasterHash
                    }
                });

                // await prisma.$disconnect(); // Do not disconnect, let the app handle it
            } catch (innerError: any) {
                console.error('❌ Failed to queue PendingAnchor:', innerError);
            }
        }

        // Step 2: Generate or reuse tag configuration
        const config = await this.generateTagConfig(params.configDescription);

        // Step 3: Create encoding queue item WITH FALCON DATA
        const queueItem = await this.encoderQueueRepository.create({
            config: { connect: { id: config.id } },
            subject: params.linkedSubjectId ? { connect: { id: params.linkedSubjectId } } : undefined,
            partnerAsset: params.partnerAssetId ? { connect: { id: params.partnerAssetId } } : undefined,

            // REAL FALCON CRYPTOGRAPHY
            masterHashVaultKey: assetReg.falconMasterHash,
            hashTruncated: assetReg.hashTruncated,

            // Pre-compute SDM payload structure
            sdmPayload: {
                hashTruncated: assetReg.hashTruncated,
                falconPublicKey: assetReg.falconPublicKey,
                assetType: params.assetType,
                issuedAt: new Date().toISOString(),
            },

            operator: params.operatorId ? { connect: { id: params.operatorId } } : undefined,
            station: params.stationId ? { connect: { id: params.stationId } } : undefined,

            status: 'AWAITING_PAYMENT',
            priority: 0,
        });

        console.log('✅ Encoding queue item created with Falcon hash');
        console.log('   Queue ID: ' + queueItem.id);
        console.log('   Truncated Hash(for SDMENC): ' + assetReg.hashTruncated);

        // Structured Logging
        const { encodingLogger } = await import('../../utils/logger');
        encodingLogger.info('Encoding Job Queued', {
            queueId: queueItem.id,
            assetId: params.partnerAssetId || 'NEW_ASSET',
            configId: config.id,
            operatorId: params.operatorId
        });

        return {
            queueItem,
            config,
            falconMasterHash: assetReg.falconMasterHash,
            falconSignature: assetReg.falconSignature,
            falconPublicKey: assetReg.falconPublicKey,
            masterHashVaultKey: assetReg.masterHashVaultKey,
            hashTruncated: assetReg.hashTruncated,
        };
    }

    /**
     * Resolve asset data for a given tag
     */
    async resolveAssetForTag(hashTruncated: string, tagInternalId: string): Promise<PublicAssetData> {
        const tag = await this.tagRepository.findById(tagInternalId);

        if (!tag) {
            throw new Error('Tag not found');
        }

        // Verify hash if needed (optional, as we already decrypted)
        if (tag.hashTruncated !== hashTruncated) {
            console.warn('Hash mismatch for tag ' + tagInternalId + '. Expected ' + tag.hashTruncated + ', got ' + hashTruncated);
        }

        return {
            id: tag.partnerAssetId || 'UNKNOWN_ASSET',
            type: tag.partnerAsset?.type || 'UNKNOWN_TYPE',
            status: tag.status,
            metadata: tag.partnerAsset?.metadata || {},
            linkedSubjectId: tag.linkedSubjectId
        };
    }

    /**
     * Find tag by internal ID
     */
    async findByTagInternalId(tagInternalId: string) {
        return this.tagRepository.findById(tagInternalId);
    }

    /**
     * Fallback seed generation if QUANTUM_SEED env var is not set
     * IN PRODUCTION: QUANTUM_SEED MUST be a high-entropy secret from vault
     */
    private generateFallbackSeed(): string {
        console.warn('⚠️  Using fallback quantum seed. Set QUANTUM_SEED in production!');
        return 'FALLBACK_SEED_NOT_FOR_PRODUCTION_' + Date.now();
    }
}

export interface PublicAssetData {
    id: string;
    type: string;
    status: string;
    metadata: any;
    linkedSubjectId?: string | null;
}
