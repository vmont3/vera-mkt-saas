import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();

export class SecretManagerService {

    /**
     * Retrieve a secret from Google Secret Manager
     * @param name Name of the secret (e.g., 'algorand-[REDACTED]')
     * @returns The secret value string
     */
    static async getSecret(name: string): Promise<string> {
        // In development, fallback to process.env
        if (process.env.NODE_ENV !== 'production') {
            const envKey = name.toUpperCase().replace(/-/g, '_');
            if (process.env[envKey]) return process.env[envKey] as string;
            console.warn(`[SECRET-MANAGER] Secret ${name} not found in env, trying Cloud...`);
        }

        try {
            const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'quantum-cert';
            const [version] = await client.accessSecretVersion({
                name: `projects/${projectId}/secrets/${name}/versions/latest`
            });

            const payload = version.payload?.data?.toString();
            if (!payload) throw new Error(`Secret payload is empty for ${name}`);

            return payload;
        } catch (error: any) {
            console.error(`[SECRET-MANAGER] Failed to fetch secret ${name}:`, error.message);
            throw error;
        }
    }
}
