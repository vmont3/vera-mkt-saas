// src/modules/tag-encoding/infra/AwsKmsClient.ts

import { KmsClient, KmsClientConfig } from "./KmsClient";
import {
    SecretsManagerClient,
    GetSecretValueCommand
} from "@aws-sdk/client-secrets-manager";
import {
    KMSClient,
    GenerateDataKeyCommand,
    DecryptCommand
} from "@aws-sdk/client-kms";
import crypto from "crypto";

/**
 * Implementação REAL do KmsClient usando AWS KMS
 *
 * Estratégia de segurança:
 * 1. Usa GenerateDataKey para derivar chaves únicas por contexto
 * 2. Chaves NUNCA são salvas em disco
 * 3. Chaves carregadas apenas na RAM durante sessão de encoding
 * 4. Cache em memória com TTL curto (max 5 minutos)
 * 5. Encryption context para auditoria e controle de acesso
 */
export class AwsKmsClient implements KmsClient {
    private kmsClient: KMSClient;
    private secretsClient: SecretsManagerClient;
    private config: KmsClientConfig;

    // Cache de chaves EM MEMÓRIA (nunca em disco!)
    private keyCache: Map<string, { key: Uint8Array; expiresAt: number }> = new Map();
    private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutos máximo

    constructor(config: KmsClientConfig) {
        this.config = config;
        this.kmsClient = new KMSClient({ region: config.region || "us-east-1" });
        this.secretsClient = new SecretsManagerClient({ region: config.region || "us-east-1" });
    }

    async getAppKey(): Promise<Uint8Array> {
        return this.getKey("K_APP", 0);
    }

    async getSdmKey(): Promise<Uint8Array> {
        return this.getKey("K_SDM", 1);
    }

    async getNdefKey(): Promise<Uint8Array> {
        return this.getKey("K_NDEF", 2);
    }

    async getProtKey(): Promise<Uint8Array> {
        return this.getKey("K_PROT", 3);
    }

    async getAuthHostKey(): Promise<Uint8Array> {
        return this.getKey("K_AUTH_HOST", 4);
    }

    /**
     * Busca/gera chave usando AWS KMS GenerateDataKey
     *
     * Duas estratégias disponíveis:
     * 1. Secrets Manager (se ARN configurado)
     * 2. GenerateDataKey com encryption context (mais seguro)
     */
    private async getKey(keyName: string, keyNumber: number): Promise<Uint8Array> {
        // Verifica cache
        const cacheKey = `${keyName}-${keyNumber}`;
        const cached = this.keyCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`[AWS KMS] ✓ Using ${keyName} from memory cache`);
            return cached.key;
        }

        console.log(`[AWS KMS] Generating ${keyName} (Key ${keyNumber})...`);

        let keyBytes: Uint8Array;

        // Estratégia 1: Tentar buscar do Secrets Manager (se configurado)
        if (this.config.keyContext?.useSecretsManager === "true") {
            keyBytes = await this.getKeyFromSecretsManager(keyName);
        } else {
            // Estratégia 2: GenerateDataKey com context (RECOMENDADO)
            keyBytes = await this.generateDataKey(keyName, keyNumber);
        }

        // Armazena no cache (APENAS EM MEMÓRIA!)
        this.keyCache.set(cacheKey, {
            key: keyBytes,
            expiresAt: Date.now() + this.cacheTtlMs,
        });

        console.log(`[AWS KMS] ✓ Key ${keyName} loaded (${keyBytes.length} bytes)`);
        return keyBytes;
    }

    /**
     * Gera chave usando AWS KMS GenerateDataKey
     *
     * ATENÇÃO: A chave plaintext É retornada, mas NUNCA é salva em disco!
     */
    private async generateDataKey(keyName: string, keyNumber: number): Promise<Uint8Array> {
        const encryptionContext = {
            application: "quantum-cert",
            purpose: "ntag424-encoding",
            keyName: keyName,
            keyNumber: String(keyNumber),
            ...this.config.keyContext,
        };

        try {
            const command = new GenerateDataKeyCommand({
                KeyId: this.config.masterKeyId,
                KeySpec: "AES_128", // 16 bytes (AES-128)
                EncryptionContext: encryptionContext,
            });

            const response = await this.kmsClient.send(command);

            if (!response.Plaintext) {
                throw new Error("KMS GenerateDataKey returned no plaintext");
            }

            // IMPORTANTE: response.Plaintext contém a chave em claro
            // Ela é usada APENAS durante a sessão e NUNCA é salva!
            return new Uint8Array(response.Plaintext);
        } catch (error: any) {
            console.error(`[AWS KMS] ✗ Error generating ${keyName}:`, error.message);

            // Fallback para desenvolvimento (SE não estiver em produção)
            if (process.env.NODE_ENV !== "production") {
                console.warn(`[AWS KMS] ⚠️  Using MOCK key for ${keyName} (development only)`);
                return this.mockGenerateKey(keyName, keyNumber);
            }

            throw error;
        }
    }

    /**
     * Busca chave do AWS Secrets Manager
     *
     * Usa esta estratégia SE as chaves foram pré-geradas e armazenadas no Secrets Manager
     */
    private async getKeyFromSecretsManager(keyName: string): Promise<Uint8Array> {
        const secretName = `${this.config.keyContext?.secretsPrefix || "quantum-cert/ntag424"}/${keyName}`;

        try {
            const command = new GetSecretValueCommand({
                SecretId: secretName,
            });

            const response = await this.secretsClient.send(command);

            if (response.SecretBinary) {
                return new Uint8Array(response.SecretBinary);
            } else if (response.SecretString) {
                // Se armazenado como hex string
                const hex = response.SecretString;
                return new Uint8Array(Buffer.from(hex, "hex"));
            } else {
                throw new Error("Secret has no binary or string value");
            }
        } catch (error: any) {
            console.error(`[AWS KMS] ✗ Error fetching ${keyName} from Secrets Manager:`, error.message);

            // Fallback para GenerateDataKey
            console.warn(`[AWS KMS] Falling back to GenerateDataKey for ${keyName}`);
            return this.generateDataKey(keyName, 0);
        }
    }

    /**
     * Mock: Gera chave determinística para DESENVOLVIMENTO
     *
     * ⚠️  NUNCA usar em produção!
     */
    private mockGenerateKey(keyName: string, keyNumber: number): Uint8Array {
        const seed = `quantum-cert-mock-${keyName}-${keyNumber}-${this.config.masterKeyId}`;
        const hash = crypto.createHash("sha256").update(seed).digest();

        // Pega os primeiros 16 bytes (AES-128)
        return new Uint8Array(hash.slice(0, 16));
    }

    /**
     * Limpa cache de chaves (força refresh)
     *
     * Útil após rotação de chaves ou para liberar memória
     */
    clearCache(): void {
        // Sobrescreve com zeros antes de limpar (segurança)
        for (const [key, value] of this.keyCache.entries()) {
            value.key.fill(0);
        }

        this.keyCache.clear();
        console.log("[AWS KMS] ✓ Key cache cleared and zeroed");
    }

    /**
     * Deriva chave específica para uma tag usando KMS Data Key
     *
     * Gera chave ÚNICA por tag, útil para:
     * - Chaves específicas por ativo
     * - Rotação de chaves
     * - Isolamento entre tags
     */
    async deriveTagKey(tagId: string, purpose: string): Promise<Uint8Array> {
        const encryptionContext = {
            application: "quantum-cert",
            purpose: "tag-specific-key",
            tagId,
            keyPurpose: purpose,
            ...this.config.keyContext,
        };

        console.log(`[AWS KMS] Deriving key for tag ${tagId} (${purpose})...`);

        try {
            const command = new GenerateDataKeyCommand({
                KeyId: this.config.masterKeyId,
                KeySpec: "AES_128",
                EncryptionContext: encryptionContext,
            });

            const response = await this.kmsClient.send(command);

            if (!response.Plaintext) {
                throw new Error("KMS GenerateDataKey returned no plaintext");
            }

            return new Uint8Array(response.Plaintext);
        } catch (error: any) {
            console.error(`[AWS KMS] ✗ Error deriving key for tag ${tagId}:`, error.message);

            // Fallback para desenvolvimento
            if (process.env.NODE_ENV !== "production") {
                const seed = `${tagId}-${purpose}`;
                const hash = crypto.createHash("sha256").update(seed).digest();
                return new Uint8Array(hash.slice(0, 16));
            }

            throw error;
        }
    }

    /**
     * Decripta dados usando AWS KMS Decrypt
     *
     * Útil se você armazenou chaves encriptadas e precisa decriptar
     */
    async decryptData(encryptedKey: Uint8Array, encryptionContext?: Record<string, string>): Promise<Uint8Array> {
        try {
            const command = new DecryptCommand({
                CiphertextBlob: encryptedKey,
                EncryptionContext: encryptionContext,
            });

            const response = await this.kmsClient.send(command);

            if (!response.Plaintext) {
                throw new Error("KMS Decrypt returned no plaintext");
            }

            return new Uint8Array(response.Plaintext);
        } catch (error: any) {
            console.error("[AWS KMS] ✗ Error decrypting data:", error.message);
            throw error;
        }
    }
}

/**
 * Factory function para criar cliente AWS KMS
 */
export function createAwsKmsClient(
    masterKeyId: string,
    region: string = "us-east-1",
    useSecretsManager: boolean = false
): AwsKmsClient {
    return new AwsKmsClient({
        masterKeyId,
        region,
        keyContext: {
            application: "quantum-cert",
            purpose: "ntag424-encoding",
            useSecretsManager: String(useSecretsManager),
            secretsPrefix: "quantum-cert/ntag424",
        },
    });
}
