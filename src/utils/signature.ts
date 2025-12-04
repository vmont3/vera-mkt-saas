import { createVerify, createSign } from 'crypto';

export function verifySignature(
    message: string,
    signature: string,
    publicKey: string
): boolean {
    try {
        const verifier = createVerify('SHA256');
        verifier.update(message);
        return verifier.verify(publicKey, signature, 'base64');
    } catch {
        return false;
    }
}

export function generateSignature(message: string, privateKey: string): string {
    const signer = createSign('SHA256');
    signer.update(message);
    return signer.sign(privateKey, 'base64');
}
