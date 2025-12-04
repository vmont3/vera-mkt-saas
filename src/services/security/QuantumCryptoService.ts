import { falcon } from 'falcon-crypto';
import {
    falconSign,
    buildCanonicalPayload,
    retrieveFalconPrivateKey,
    parsePublicKey
} from '../../modules/crypto/falcon';
import { FalconKeyManager } from '../../modules/crypto/falcon/FalconKeyManager';
import type { AssetPayload, FalconSignatureResult } from '../../modules/crypto/falcon';

/**
 * Quantum Cryptography Service
 * 
 * Provides Falcon-512 post-quantum cryptographic operations for Quantum Cert.
 * Uses a system-wide Falcon-512 master keypair for all asset signatures.
 */
export class QuantumCryptoService {
    private privateKeySecretId: string;
    private publicKeyHex: string;
    private keyManager: FalconKeyManager;

    constructor() {
        // Load configuration from environment
        this.privateKeySecretId = process.env.FALCON_PRIVATE_KEY_SECRET_ID || '';
        this.publicKeyHex = process.env.FALCON_PUBLIC_KEY_HEX || '';
        this.keyManager = FalconKeyManager.getInstance();

        if (!this.privateKeySecretId) {
            console.warn('⚠️  FALCON_PRIVATE_KEY_SECRET_ID not set. Run init-falcon-keypair.ts first.');
        }

        if (!this.publicKeyHex) {
            console.warn('⚠️  FALCON_PUBLIC_KEY_HEX not set. Run init-falcon-keypair.ts first.');
        }
    }

    /**
     * Generate Falcon-512 master hash for an asset
     * 
     * Flow:
     * 1. Build canonical payload from asset data
     * 2. Sign payload with Falcon-512 private key
     * 3. Generate master hash = SHA-256(signature)
     * 4. Truncate hash to 128 bits for tag storage
     * 
     * @param assetId Internal asset ID
     * @param assetData Stable asset data
     * @param quantumSeed Not used (preserved for backward compatibility)
     * @returns Master hash (hex string)
     */
    async generateMasterHash(
        assetId: string,
        assetData: { type: string; category?: string; issuedAt: Date },
        quantumSeed?: string
    ): Promise<string> {
        if (!this.privateKeySecretId) {
            throw new Error('Falcon private key secret ID not configured');
        }

        // Build canonical payload
        const payload: AssetPayload = {
            assetId,
            type: assetData.type,
            category: assetData.category,
            issuedAt: assetData.issuedAt.toISOString(),
        };

        const canonicalPayload = buildCanonicalPayload(payload);

        // Retrieve private key via KeyManager
        // Explicitly await and cast to Uint8Array to resolve TS confusion
        const privateKey: Uint8Array = await (this.keyManager as any).retrievePrivateKey(this.privateKeySecretId);

        // Sign directly using falcon lib (since we have the key bytes)
        // MUST AWAIT: falcon.signDetached returns a Promise
        const signature = await falcon.signDetached(Buffer.from(canonicalPayload), privateKey);

        // Calculate Master Hash (SHA-256 of signature)
        const crypto = require('crypto');
        const masterHash = crypto.createHash('sha256').update(signature).digest('hex');

        return masterHash;
    }

    /**
     * Generate complete Falcon signature result (for advanced use cases)
     * @param assetData Asset data
     * @returns Complete signature result with master hash and truncated hash
     */
    async generateSignatureResult(assetData: AssetPayload): Promise<FalconSignatureResult> {
        if (!this.privateKeySecretId) {
            throw new Error('Falcon private key secret ID not configured');
        }

        const canonicalPayload = buildCanonicalPayload(assetData);

        // Retrieve key
        const privateKey: Uint8Array = await (this.keyManager as any).retrievePrivateKey(this.privateKeySecretId);

        // Sign
        // MUST AWAIT: falcon.signDetached returns a Promise
        const signature = await falcon.signDetached(Buffer.from(canonicalPayload), privateKey);
        const signatureHex = Buffer.from(signature).toString('hex');

        // Master Hash
        const crypto = require('crypto');
        const masterHash = crypto.createHash('sha256').update(signature).digest('hex');

        // Truncated Hash (first 16 bytes / 32 hex chars)
        const truncatedHash = masterHash.substring(0, 32);

        return {
            signature,
            signatureHex,
            masterHash,
            truncatedHash
        };
    }

    /**
     * Get Falcon system public key
     * @returns Public key as Uint8Array
     */
    getPublicKey(): Uint8Array {
        if (!this.publicKeyHex) {
            throw new Error('Falcon public key not configured');
        }
        // Explicitly cast to Uint8Array if TS thinks it's a Promise (it shouldn't be)
        return (this.keyManager as any).parsePublicKey(this.publicKeyHex) as Uint8Array;
    }

    /**
     * Get Falcon public key as hex string
     * @returns Public key hex
     */
    getPublicKeyHex(): string {
        return this.publicKeyHex;
    }

    // ============= LEGACY METHODS (for backward compatibility) =============

    async generateKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
        console.warn('⚠️ generateKeyPair() is deprecated. Use system-wide keypair instead.');
        return falcon.keyPair();
    }

    async sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
        return falcon.signDetached(message, privateKey);
    }

    async verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
        return falcon.verifyDetached(signature, message, publicKey);
    }

    stringToBytes(str: string): Uint8Array {
        return new TextEncoder().encode(str);
    }

    bytesToHex(bytes: Uint8Array): string {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
