import { falcon } from 'falcon-crypto';
import { hexToBytes } from './falconKeygen';

/**
 * Falcon-512 Signature Verification Module
 * 
 * Verifies Falcon-512 signatures against the system-wide public key.
 * Used for audit trails and integrity checks.
 */

/**
 * Verify a Falcon-512 signature
 * @param payload Original payload that was signed
 * @param signature Signature to verify (can be Uint8Array or hex string)
 * @param publicKey Public key (can be Uint8Array or hex string)
 * @returns true if signature is valid
 */
export async function falconVerify(
    payload: string | Uint8Array,
    signature: Uint8Array | string,
    publicKey: Uint8Array | string
): Promise<boolean> {
    // Convert payload to bytes
    const payloadBytes = typeof payload === 'string'
        ? new TextEncoder().encode(payload)
        : payload;

    // Convert signature to bytes if hex
    const signatureBytes = typeof signature === 'string'
        ? hexToBytes(signature)
        : signature;

    // Convert public key to bytes if hex
    const publicKeyBytes = typeof publicKey === 'string'
        ? hexToBytes(publicKey)
        : publicKey;

    try {
        // Verify signature
        const isValid = await falcon.verifyDetached(
            signatureBytes,
            payloadBytes,
            publicKeyBytes
        );

        return isValid;
    } catch (error) {
        console.error('Falcon signature verification failed:', error);
        return false;
    }
}

/**
 * Batch verify multiple signatures (for audit purposes)
 * @param verifications Array of {payload, signature, publicKey} tuples
 * @returns Array of boolean results
 */
export async function falconBatchVerify(
    verifications: Array<{
        payload: string | Uint8Array;
        signature: Uint8Array | string;
        publicKey: Uint8Array | string;
    }>
): Promise<boolean[]> {
    const results = await Promise.all(
        verifications.map(({ payload, signature, publicKey }) =>
            falconVerify(payload, signature, publicKey)
        )
    );

    return results;
}
