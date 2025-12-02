import {
    SecretsManagerClient,
    GetSecretValueCommand,
    CreateSecretCommand,
    PutSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import * as crypto from 'crypto';

export class AWSKMSService {
    private secretsClient: SecretsManagerClient;
    private kmsClient: KMSClient;

    constructor() {
        const region = process.env.AWS_REGION || 'us-east-1';
        this.secretsClient = new SecretsManagerClient({ region });
        this.kmsClient = new KMSClient({ region });
    }

    async generateAndStoreKey(secretName: string, description: string): Promise<string> {
        const key = crypto.randomBytes(16);
        const keyHex = key.toString('hex');

        try {
            const command = new CreateSecretCommand({
                Name: secretName,
                Description: description,
                SecretString: keyHex,
                Tags: [
                    { Key: 'Service', Value: 'QuantumCert' },
                    { Key: 'Type', Value: 'NTAG424Key' },
                ],
            });

            const response = await this.secretsClient.send(command);
            if (!response.ARN) throw new Error('Failed to create secret');
            return response.ARN;
        } catch (error: any) {
            if (error.name === 'ResourceExistsException') {
                await this.secretsClient.send(new PutSecretValueCommand({ SecretId: secretName, SecretString: keyHex }));
                const accountId = process.env.AWS_ACCOUNT_ID || '000000000000';
                const region = process.env.AWS_REGION || 'us-east-1';
                return `arn:aws:secretsmanager:${region}:${accountId}:secret:${secretName}`;
            }
            throw error;
        }
    }

    async retrieveKey(secretArn: string): Promise<Buffer> {
        const response = await this.secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
        if (!response.SecretString) throw new Error('Secret value is empty');
        return Buffer.from(response.SecretString, 'hex');
    }

    async generateNTAG424KeySet(configId: string, description: string) {
        const prefix = `qc/ntag424/${configId}`;
        const [keyAppSecretArn, keySdmSecretArn, keyNdefSecretArn, keyProtSecretArn, keyAuthSecretArn] = await Promise.all([
            this.generateAndStoreKey(`${prefix}/k_app`, `${description} - K_APP`),
            this.generateAndStoreKey(`${prefix}/k_sdm`, `${description} - K_SDM`),
            this.generateAndStoreKey(`${prefix}/k_ndef`, `${description} - K_NDEF`),
            this.generateAndStoreKey(`${prefix}/k_prot`, `${description} - K_PROT`),
            this.generateAndStoreKey(`${prefix}/k_auth`, `${description} - K_AUTH`),
        ]);

        return { keyAppSecretArn, keySdmSecretArn, keyNdefSecretArn, keyProtSecretArn, keyAuthSecretArn };
    }

    /**
     * Encrypt data using AES-128-CBC with zero IV (NTAG default for some ops)
     * In a real KMS scenario, this would call kms.encrypt
     */
    async encrypt(keyArn: string, data: Buffer): Promise<Buffer> {
        const key = await this.retrieveKey(keyArn);
        const iv = Buffer.alloc(16, 0); // Default IV for NTAG operations often 0
        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        cipher.setAutoPadding(false); // Manual padding usually required for APDUs
        return Buffer.concat([cipher.update(data), cipher.final()]);
    }

    /**
     * Decrypt data using AES-128-CBC
     */
    async decrypt(keyArn: string, data: Buffer): Promise<Buffer> {
        const key = await this.retrieveKey(keyArn);
        const iv = Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    }

    /**
     * Generate AES-CMAC
     */
    async generateMac(keyArn: string, data: Buffer): Promise<Buffer> {
        const key = await this.retrieveKey(keyArn);
        return this.cmacAes(key, data);
    }

    /**
     * CMAC-AES implementation (Internal helper)
     */
    private cmacAes(key: Buffer, data: Buffer): Buffer {
        if (key.length !== 16) throw new Error('Key must be 16 bytes for AES-128');

        const blockSize = 16;

        // Generate subkeys
        const zero = Buffer.alloc(blockSize, 0);
        const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
        const L = cipher.update(zero);
        cipher.final();

        const K1 = this.leftShift(L);
        if (L[0] & 0x80) K1[blockSize - 1] ^= 0x87;

        const K2 = this.leftShift(K1);
        if (K1[0] & 0x80) K2[blockSize - 1] ^= 0x87;

        // Process data
        const numBlocks = Math.ceil(data.length / blockSize);
        const lastBlockComplete = (data.length % blockSize === 0) && (data.length !== 0);

        let Mn: Buffer;
        if (lastBlockComplete) {
            const lastBlock = data.slice(-blockSize);
            Mn = Buffer.alloc(blockSize);
            for (let i = 0; i < blockSize; i++) {
                Mn[i] = lastBlock[i] ^ K1[i];
            }
        } else {
            const lastBlockLen = data.length % blockSize;
            const lastBlock = data.slice(-lastBlockLen);
            const padded = Buffer.alloc(blockSize, 0);
            lastBlock.copy(padded);
            padded[lastBlockLen] = 0x80;

            Mn = Buffer.alloc(blockSize);
            for (let i = 0; i < blockSize; i++) {
                Mn[i] = padded[i] ^ K2[i];
            }
        }

        let X = Buffer.alloc(blockSize, 0);
        const numFullBlocks = Math.floor(data.length / blockSize);

        for (let n = 0; n < numFullBlocks; n++) {
            const block = data.slice(n * blockSize, (n + 1) * blockSize);
            for (let i = 0; i < blockSize; i++) {
                X[i] ^= block[i];
            }
            const cipher = crypto.createCipheriv('aes-128-ecb', key, '');
            X = cipher.update(X);
            cipher.final();
        }

        const finalBlock = lastBlockComplete ? data.slice(-blockSize) : Mn;
        for (let i = 0; i < blockSize; i++) {
            X[i] ^= finalBlock[i];
        }
        const finalCipher = crypto.createCipheriv('aes-128-ecb', key, '');
        const T = finalCipher.update(X);
        finalCipher.final();

        return T;
    }

    private leftShift(buffer: Buffer): Buffer {
        const shifted = Buffer.alloc(buffer.length);
        let overflow = 0;
        for (let i = buffer.length - 1; i >= 0; i--) {
            shifted[i] = (buffer[i] << 1) | overflow;
            overflow = (buffer[i] & 0x80) ? 1 : 0;
        }
        return shifted;
    }
}
