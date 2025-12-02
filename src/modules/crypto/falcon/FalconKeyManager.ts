import { falcon } from 'falcon-crypto';
import { IBMSecretsManagerService } from '../../../services/security/IBMSecretsManagerService';
import { parsePublicKey } from './falconKeygen';

/**
 * FalconKeyManager
 * 
 * Manages Falcon-512 key pairs, including generation, storage, and retrieval.
 * Integrates with IBM Secrets Manager for secure private key storage.
 */
export class FalconKeyManager {
    private secretsManager: IBMSecretsManagerService;
    private static instance: FalconKeyManager;

    private constructor() {
        this.secretsManager = new IBMSecretsManagerService();
    }

    public static getInstance(): FalconKeyManager {
        if (!FalconKeyManager.instance) {
            FalconKeyManager.instance = new FalconKeyManager();
        }
        return FalconKeyManager.instance;
    }

    /**
     * Generate a new Falcon-512 keypair
     * @returns Object containing privateKey (Uint8Array) and publicKey (Uint8Array)
     */
    public async generateKeyPair(): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> {
        console.log('🔑 Generating new Falcon-512 keypair...');
        const keypair = await falcon.keyPair();
        return {
            privateKey: keypair.privateKey,
            publicKey: keypair.publicKey
        };
    }

    /**
     * Store Falcon-512 keys securely
     * - Private Key: Stored in IBM Secrets Manager
     * - Public Key: Returned (can be stored in env or DB)
     * 
     * @param keypair The keypair to store
     * @param name Name/Label for the secret
     * @returns Object containing secretId (for private key) and publicKeyHex
     */
    public async storeKeys(
        keypair: { privateKey: Uint8Array; publicKey: Uint8Array },
        name: string = 'falcon-master-key'
    ): Promise<{ secretId: string; publicKeyHex: string }> {
        const privateKeyHex = Buffer.from(keypair.privateKey).toString('hex');
        const publicKeyHex = Buffer.from(keypair.publicKey).toString('hex');

        console.log(`🔒 Storing Falcon private key in IBM Secrets Manager (${name})...`);

        // Store private key in IBM Secrets Manager
        const secretId = await this.secretsManager.storeSecret(
            name,
            keypair.privateKey, // Pass Uint8Array directly
            'Falcon-512 Master Private Key'
        );

        if (!secretId) {
            throw new Error('Failed to store private key in IBM Secrets Manager');
        }

        console.log('✅ Private key stored successfully. Secret ID:', secretId);

        return {
            secretId,
            publicKeyHex
        };
    }

    /**
     * Retrieve Falcon-512 private key from storage
     * @param secretId The ID of the secret in IBM Secrets Manager
     * @returns Private key as Uint8Array
     */
    public async retrievePrivateKey(secretId: string): Promise<Uint8Array> {
        if (!secretId) {
            throw new Error('Secret ID is required to retrieve private key');
        }

        console.log(`🔓 Retrieving Falcon private key (ID: ${secretId})...`);

        const privateKey = await this.secretsManager.retrieveSecret(secretId);

        if (!privateKey || privateKey.length === 0) {
            throw new Error(`Secret not found or empty for ID: ${secretId}`);
        }

        return privateKey;
    }

    /**
     * Parse public key from hex string
     * @param publicKeyHex Public key in hex format
     * @returns Public key as Uint8Array
     */
    public parsePublicKey(publicKeyHex: string): Uint8Array {
        return parsePublicKey(publicKeyHex);
    }
}
