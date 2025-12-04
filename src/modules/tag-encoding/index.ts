// src/modules/tag-encoding/index.ts

/**
 * Módulo de Encoding de Tags NTAG 424 DNA
 * Quantum Cert - Configuração Patenteada
 * 
 * Este módulo exporta todas as interfaces e classes necessárias
 * para implementar o sistema de encoding de tags.
 */

// ========== Domain Types ==========
export type {
    AssetType,
    EncodingJobStatus,
    TagEncodingJob,
    NfcKeyConfiguration,
    SdmConfiguration,
    EncodingResult,
    NfcDriverConfig,
    EncodingQueueConfig,
    EncodingProgressEvent,
} from "./domain/TagEncodingTypes";

// ========== Core Interfaces ==========
export { TagEncodingQueue } from "./core/TagEncodingQueue";
export { TagEncodingService } from "./core/TagEncodingService";

// ========== Queue Implementations ==========
export { InMemoryEncodingQueue } from "./infra/InMemoryEncodingQueue";
export { PrismaEncodingQueue } from "./infra/PrismaEncodingQueue";

// ========== NFC Hardware Driver ==========
// ========== NFC Hardware Driver ==========
export type { NfcHardwareDriver } from "./driver/NfcHardwareDriver";
export { Acr122uNfcHardwareDriver } from "./driver/Acr122uNfcHardwareDriver";

// ========== Encoder ==========
export { Ntag424Encoder } from "./encoder/Ntag424Encoder";
export type { Ntag424EncoderConfig } from "./encoder/Ntag424Encoder";

// ========== KMS Client ==========
export type { KmsClient, KmsClientConfig } from "./infra/KmsClient";
export { AwsKmsClient, createAwsKmsClient } from "./infra/AwsKmsClient";

// ========== Utilities ==========
export type { SdmLayout } from "./util/SdmLayout";
export {
    buildSdmUrlTemplate,
    calculateSdmOffsets,
    validateSdmLayout,
    QUANTUM_CERT_DEFAULT_LAYOUT,
} from "./util/SdmLayout";

export {
    buildNdefForQuantumCert,
    buildNdefMessageWithTlv,
    calculateNdefFileSize,
    validateNdefSize,
    ndefToDebugString,
} from "./util/NdefBuilder";

// ========== Factory Functions ==========

import { TagEncodingService } from "./core/TagEncodingService";
import { Ntag424Encoder, Ntag424EncoderConfig } from "./encoder/Ntag424Encoder";
import { TagEncodingQueue } from "./core/TagEncodingQueue";
import { NfcHardwareDriver } from "./driver/NfcHardwareDriver";
import { KmsClient } from "./infra/KmsClient";
import { TagRegistry } from "../tag-registry/TagRegistry";

/**
 * Cria uma instância completa do TagEncodingService
 * pronta para uso em produção
 */
export function createTagEncodingService(config: {
    queue: TagEncodingQueue;
    driver: NfcHardwareDriver;
    kms: KmsClient;
    stationId: string;
    tagRegistry: TagRegistry;
    encoderConfig?: Ntag424EncoderConfig;
}): TagEncodingService {
    const encoderConfig: Ntag424EncoderConfig = config.encoderConfig || {
        ccSize: 32,
        ndefSize: 256,
        protectedSize: 128,
    };

    const encoder = new Ntag424Encoder(config.driver, config.kms, encoderConfig);

    return new TagEncodingService(config.queue, encoder, config.stationId, config.tagRegistry);
}

/**
 * Exemplo de uso:
 * 
 * ```typescript
 * import { 
 *   createTagEncodingService,
 *   PrismaEncodingQueue,
 *   UfrNfcHardwareDriver,
 *   createAwsKmsClient
 * } from './modules/tag-encoding';
 * 
 * const service = createTagEncodingService({
 *   queue: new PrismaEncodingQueue(),
 *   driver: new UfrNfcHardwareDriver(),
 *   kms: createAwsKmsClient('arn:aws:kms:...'),
 *   stationId: 'station-001',
 * });
 * 
 * // Processar jobs em loop
 * await service.startLoop(1000);
 * 
 * // Ou processar um job único
 * await service.processNextJob();
 * ```
 */
