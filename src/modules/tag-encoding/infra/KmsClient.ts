// src/modules/tag-encoding/infra/KmsClient.ts

/**
 * Abstração de um KMS (AWS KMS, Azure Key Vault, HSM, etc.)
 * 
 * Interface para gerenciamento seguro de chaves NTAG 424 DNA.
 * Implementações concretas podem usar AWS KMS, Azure Key Vault, HashiCorp Vault, etc.
 * 
 * IMPORTANTE: As chaves retornadas são usadas apenas em ambiente seguro
 * (servidor backend) para construir comandos de autenticação.
 * NUNCA exponha chaves para o cliente/frontend.
 */
export interface KmsClient {
    /**
     * K0 - Application Master Key
     * Chave principal para autenticação e gerenciamento da aplicação NTAG 424 DNA
     */
    getAppKey(): Promise<Uint8Array>;

    /**
     * K1 - SDM Key
     * Chave usada para Secure Dynamic Messaging (encriptação UID + metadata)
     */
    getSdmKey(): Promise<Uint8Array>;

    /**
     * K2 - NDEF File Key
     * Chave para proteção do arquivo NDEF
     */
    getNdefKey(): Promise<Uint8Array>;

    /**
     * K3 - Protected File Key
     * Chave para arquivo protegido (dados internos)
     */
    getProtKey(): Promise<Uint8Array>;

    /**
     * K4 - Authentication Host Key
     * Chave para autenticação do host (verificação de tags)
     */
    getAuthHostKey(): Promise<Uint8Array>;
}

/**
 * Configuração para cliente KMS
 */
export interface KmsClientConfig {
    /**
     * ID/ARN da chave mestre no KMS
     * Ex: "arn:aws:kms:us-east-1:123456789:key/abc-def-ghi"
     */
    masterKeyId: string;

    /**
     * Região (para AWS KMS)
     */
    region?: string;

    /**
     * Contexto adicional para derivação de chaves
     */
    keyContext?: Record<string, string>;
}
