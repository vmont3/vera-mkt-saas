import crypto from 'crypto';

export function generateIntegrityCode(truncatedHash: string, deviceSecret: string) {
    return crypto
        .createHmac('sha256', deviceSecret)
        .update(truncatedHash)
        .digest('hex');
}
