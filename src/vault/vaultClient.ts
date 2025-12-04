import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// Ensure key is 32 bytes. In production, this should be a proper secret management.
// For now, we'll hash the env var or default to ensure 32 bytes.
const getKey = () => {
    const secret = process.env.VAULT_KEY || 'default-placeholder-secret-key-change-me';
    return crypto.createHash('sha256').update(secret).digest();
};

export const encrypt = (data: string): string => {
    const iv = crypto.randomBytes(12);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    // Format: iv:tag:data
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
};

export const decrypt = (cipherText: string): string => {
    const parts = cipherText.split(':');
    if (parts.length !== 3) throw new Error('Invalid cipher text format');

    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};
