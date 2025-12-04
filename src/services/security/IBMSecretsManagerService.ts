import SecretsManagerV2 from '@ibm-cloud/secrets-manager/secrets-manager/v2';
import { IamAuthenticator } from '@ibm-cloud/secrets-manager/auth';

/**
 * IBMSecretsManagerService - Handles storage and retrieval of secrets from IBM Secrets Manager
 * 
 * Environment Variables Required:
 * - IBM_SM_API_KEY: IBM Cloud API Key
 * - IBM_SM_URL: IBM Secrets Manager instance URL
 */
export class IBMSecretsManagerService {
    private client: SecretsManagerV2 | null = null;
    private isConfigured: boolean = false;

    constructor() {
        this.initializeClient();
    }

    /**
     * Initialize IBM Secrets Manager client
     */
    private initializeClient() {
        const apiKey = process.env.IBM_SM_API_KEY;
        const serviceUrl = process.env.IBM_SM_URL;

        if (!apiKey || !serviceUrl) {
            console.warn('⚠️  IBM Secrets Manager not configured. Set IBM_SM_API_KEY and IBM_SM_URL.');
            this.isConfigured = false;
            return;
        }

        try {
            const authenticator = new IamAuthenticator({ apikey: apiKey });
            this.client = new SecretsManagerV2({
                authenticator,
                serviceUrl,
            });
            this.isConfigured = true;
            console.log('✅ IBM Secrets Manager client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize IBM Secrets Manager:', error);
            this.isConfigured = false;
        }
    }

    /**
     * Store a key in IBM Secrets Manager
     * @param secretName Unique name for the secret
     * @param secretValue The secret value (will be base64 encoded)
     * @param description Optional description
     * @returns Secret ID
     */
    async storeSecret(
        secretName: string,
        secretValue: Uint8Array | string,
        description?: string
    ): Promise<string> {
        if (!this.isConfigured || !this.client) {
            throw new Error('IBM Secrets Manager is not configured');
        }

        try {
            // Convert Uint8Array to base64 if needed
            const payload = typeof secretValue === 'string'
                ? secretValue
                : Buffer.from(secretValue).toString('base64');

            const params = {
                secretType: 'arbitrary',
                metadata: {
                    collection_type: 'application/vnd.ibm.secrets-manager.secret+json',
                    collection_total: 1,
                },
                resources: [{
                    name: secretName,
                    description: description || `Secret: ${secretName}`,
                    secret_type: 'arbitrary',
                    payload,
                }],
            };

            const response = await this.client.createSecret(params as any);
            const result: any = response.result;
            const secret = result.resources?.[0] || result;

            if (!secret || !secret.id) {
                throw new Error('Failed to get secret ID from response');
            }

            console.log(`✅ Secret stored: ${secretName} (ID: ${secret.id})`);
            return secret.id;
        } catch (error) {
            console.error('❌ Failed to store secret:', error);
            throw error;
        }
    }

    /**
     * Retrieve a secret from IBM Secrets Manager
     * @param secretId The secret ID
     * @returns Secret value as Uint8Array
     */
    async retrieveSecret(secretId: string): Promise<Uint8Array> {
        if (!this.isConfigured || !this.client) {
            throw new Error('IBM Secrets Manager is not configured');
        }

        try {
            const response = await this.client.getSecret({ id: secretId });
            const secret: any = response.result;

            if (!secret || !secret.payload) {
                throw new Error('Secret not found or has no payload');
            }

            // Decode base64 back to Uint8Array
            const buffer = Buffer.from(secret.payload as string, 'base64');
            return new Uint8Array(buffer);
        } catch (error) {
            console.error('❌ Failed to retrieve secret:', error);
            throw error;
        }
    }

    /**
     * Check if a secret exists
     * @param secretId The secret ID
     * @returns true if secret exists
     */
    async secretExists(secretId: string): Promise<boolean> {
        if (!this.isConfigured || !this.client) {
            return false;
        }

        try {
            await this.client.getSecret({ id: secretId });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete a secret (use with caution!)
     * @param secretId The secret ID
     */
    async deleteSecret(secretId: string): Promise<void> {
        if (!this.isConfigured || !this.client) {
            throw new Error('IBM Secrets Manager is not configured');
        }

        try {
            await this.client.deleteSecret({ id: secretId });
            console.log(`✅ Secret deleted: ${secretId}`);
        } catch (error) {
            console.error('❌ Failed to delete secret:', error);
            throw error;
        }
    }

    /**
     * Check if IBM Secrets Manager is properly configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }
}
