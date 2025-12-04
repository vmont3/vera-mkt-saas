import { falcon } from 'falcon-crypto';
import crypto from 'crypto';
import { retrieveFalconPrivateKey } from './falconKeygen';

/**
 * Falcon-512 Signature Module
 * 
 * Signs canonical asset payloads using the system-wide Falcon-512 private key.
 * Generates master hash from signature for use in tag encoding.
 */

export interface FalconSignatureResult {
    signature: Uint8Array;
    signatureHex: string;
    masterHash: string;        // SHA-256(signature) in hex
    truncatedHash: string;     // First 16 bytes (128 bits) of master hash
}

/**
 * Sign a canonical asset payload and generate master hash
 * @param payload Canonical payload (typically JSON string with sorted keys)
 * @param privateKeySecretId IBM Secrets Manager secret ID for private key
 * @param truncateBits Number of bits to truncate hash to (default: 128)
 * @returns Signature and derived hashes
 */
export async function falconSign(
    payload: string | Uint8Array,
    privateKeySecretId: string,
    truncateBits: number = 128
): Promise<FalconSignatureResult> {
    // Convert payload to bytes
    const payloadBytes = typeof payload === 'string'
        ? new TextEncoder().encode(payload)
        : payload;

    // Retrieve private key from IBM Secrets Manager
    const privateKey = await retrieveFalconPrivateKey(privateKeySecretId);

    // Sign the payload
    const signature = await falcon.signDetached(payloadBytes, privateKey);

    // Generate master hash: SHA-256(signature)
    const masterHash = crypto
        .createHash('sha256')
        .update(signature)
        .digest('hex');

    // Truncate hash to specified bits (default 128 bits = 16 bytes = 32 hex chars)
    const truncateHexChars = (truncateBits / 4);
    const truncatedHash = masterHash.substring(0, truncateHexChars);

    return {
        signature,
        signatureHex: bytesToHex(signature),
        masterHash,
        truncatedHash,
    };
}

/**
 * Helper: Convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
