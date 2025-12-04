// src/modules/tag-encoding/domain/TagEncodingTypes.ts

/**
 * Quantum Cert - Tag Encoding Types
 * Configuração patenteada com Falcon Hash
 */

export type AssetType =
    | "DOCUMENTO_PESSOAL"
    | "VEICULO"
    | "PRODUTO"
    | "ANIMAL"
    | "OUTRO";

export type EncodingJobStatus =
    | "PENDENTE"
    | "EM_PROCESSO"
    | "SUCESSO"
    | "ERRO"
    | "CANCELADO";

export interface TagEncodingJob {
    id: string;
    assetId: string;           // ID do ativo na Quantum Cert
    tagInternalId: string;     // id_tag_interno (chave interna da tag)
    assetType: AssetType;

    // Referência para o hash mestre Falcon (no backend)
    falconMasterId: string;

    // Hash truncado já calculado pelo Registry (nunca exposto publicamente)
    truncatedHash: string;     // armazenado em HEX ou BASE64

    // Parametrização da NDEF / SDM
    urlBase: string;           // ex: "https://api.quantumcert.com/v1/verify-tag"
    sdmEncOffset: number;
    sdmEncLength: number;
    sdmReadCtrOffset: number;
    sdmMacOffset: number;
    sdmMacInputOffset: number;

    // Controle de fila
    status: EncodingJobStatus;
    attempts: number;
    lastError?: string | null;
    encoderStationId?: string | null; // qual estação está processando
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Configuração de chaves NFC para NTAG 424 DNA
 */
export interface NfcKeyConfiguration {
    keyApp: Buffer;      // K0 - Application Master Key
    keySdm: Buffer;      // K1 - SDM Key
    keyNdef: Buffer;     // K2 - NDEF File Key
    keyProt: Buffer;     // K3 - Protected File Key
    keyAuth: Buffer;     // K4 - Authentication Key
}

/**
 * Configuração SDM (Secure Dynamic Messaging)
 */
export interface SdmConfiguration {
    encOffset: number;
    encLength: number;
    readCtrOffset: number;
    macOffset: number;
    macInputOffset: number;
}

/**
 * Resultado do encoding
 */
export interface EncodingResult {
    success: boolean;
    tagUID?: string;
    encodedAt?: Date;
    error?: string;
    technicalLog?: Record<string, any>;
}

/**
 * Configuração do driver NFC
 */
export interface NfcDriverConfig {
    readerType: 'ACR122U' | 'uFR' | 'GENERIC';
    timeout?: number;
    retryAttempts?: number;
}

/**
 * Configuração da fila de encoding
 */
export interface EncodingQueueConfig {
    maxRetries: number;
    retryDelayMs: number;
    batchSize?: number;
}

/**
 * Evento de progresso do encoding
 */
export interface EncodingProgressEvent {
    jobId: string;
    stage: 'INIT' | 'AUTH' | 'KEY_CHANGE' | 'SDM_CONFIG' | 'NDEF_WRITE' | 'COMPLETE';
    progress: number; // 0-100
    message: string;
    timestamp: Date;
}
