import { encrypt, decrypt } from './vaultClient';

// Simulation of a persistent vault using in-memory Map
const memoryVault = new Map<string, string>();

export const store = async (key: string, value: any): Promise<void> => {
    const stringValue = JSON.stringify(value);
    const encrypted = encrypt(stringValue);
    memoryVault.set(key, encrypted);
    // In real implementation, this would save to DB
    // console.log(`[Vault] Stored encrypted value for key: ${key}`);
};

export const retrieve = async (key: string): Promise<any | null> => {
    const encrypted = memoryVault.get(key);
    if (!encrypted) return null;

    try {
        const decrypted = decrypt(encrypted);
        return JSON.parse(decrypted);
    } catch (error) {
        console.error(`[Vault] Error retrieving key ${key}:`, error);
        return null;
    }
};
