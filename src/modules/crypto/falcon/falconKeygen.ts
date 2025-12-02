import { falcon } from 'falcon-crypto';
import { IBMSecretsManagerService } from '../../../services/security/IBMSecretsManagerService';

/**
 * Falcon-512 Key Generation Module
 * 
 * Generates a SYSTEM-WIDE Falcon-512 keypair for the Quantum Cert platform.
 * This keypair is used to sign ALL asset payloads.
 * 
 * The private key is stored in IBM Secrets Manager.
 * The public key should be stored in the database (e.g., GlobalConfig table).
 */

export interface FalconKeyPair {
    publicKey: Uint8Array;
    publicKeyHex: string;
    privateKeySecretId: string;
}

/**
 * Generate a new Falcon-512 keypair and store it securely
 * @param secretName Name for the secret in IBM Secrets Manager
 * @returns FalconKeyPair with public key and secret ID reference
 */
export async function generateFalconKeypair(
    secretName: string = 'quantum-cert-falcon-master-key'
): Promise<FalconKeyPair> {
    console.log('🔐 Generating Falcon-512 keypair...');

    // Generate Falcon-512 keypair
    const { publicKey, privateKey } = await falcon.keyPair();

    console.log(`✅ Keypair generated (public: ${publicKey.length} bytes, private: ${privateKey.length} bytes)`);

    // Store private key in IBM Secrets Manager
    const smService = new IBMSecretsManagerService();

    if (!smService.isReady()) {
        console.warn('⚠️  IBM Secrets Manager not configured. Private key will NOT be stored.');
        console.warn('⚠️  Set IBM_SM_API_KEY and IBM_SM_URL to enable secure key storage.');

        // For development: return a placeholder
        return {
            publicKey,
            publicKeyHex: bytesToHex(publicKey),
            privateKeySecretId: 'DEV_MODE_NO_SECRET_MANAGER',
        };
    }

    const privateKeySecretId = await smService.storeSecret(
        secretName,
        privateKey,
        'Quantum Cert Falcon-512 Master Private Key'
    );

    console.log(`✅ Private key stored in IBM Secrets Manager (ID: ${privateKeySecretId})`);

    return {
        publicKey,
        publicKeyHex: bytesToHex(publicKey),
        privateKeySecretId,
    };
}

/**
 * Alias for generateFalconKeypair for backward compatibility
 */
export const generateAndStoreKeypair = generateFalconKeypair;

/**
 * Parse hex-encoded public key back to Uint8Array
 * @param publicKeyHex Hex-encoded public key
 * @returns Public key as Uint8Array
 */
export function parsePublicKey(publicKeyHex: string): Uint8Array {
    return hexToBytes(publicKeyHex);
}

/**
 * Retrieve the Falcon-512 private key from IBM Secrets Manager
 * @param secretId The secret ID
 * @returns Private key as Uint8Array
 */
export async function retrieveFalconPrivateKey(secretId: string): Promise<Uint8Array> {
    const smService = new IBMSecretsManagerService();

    if (!smService.isReady()) {
        throw new Error('IBM Secrets Manager is not configured');
    }

    return await smService.retrieveSecret(secretId);
}

/**
 * Helper: Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Helper: Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}
