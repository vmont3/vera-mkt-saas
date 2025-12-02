// src/modules/tag-encoding/core/TagEncodingQueue.ts

import { TagEncodingJob } from "../domain/TagEncodingTypes";

/**
 * Interface abstrata para fila de encoding de tags NTAG 424 DNA
 * 
 * Permite implementações diferentes (InMemory, Prisma/PostgreSQL, Redis, etc.)
 * sem afetar a lógica de negócio do TagEncodingService
 */
export interface TagEncodingQueue {
    /**
     * Adiciona um novo job na fila
     * @param job Dados do job (sem id, status, attempts, createdAt, updatedAt)
     * @returns Job completo com id gerado
     */
    enqueue(job: Omit<TagEncodingJob, "id" | "status" | "attempts" | "createdAt" | "updatedAt">): Promise<TagEncodingJob>;

    /**
     * Busca o próximo job pendente para uma estação específica
     * @param stationId ID da estação de encoding
     * @returns Próximo job pendente ou null se não houver
     */
    getNextPending(stationId: string): Promise<TagEncodingJob | null>;

    /**
     * Marca job como "em processo"
     * @param jobId ID do job
     * @param stationId ID da estação processando
     */
    markInProcess(jobId: string, stationId: string): Promise<void>;

    /**
     * Marca job como concluído com sucesso
     * @param jobId ID do job
     */
    markSuccess(jobId: string): Promise<void>;

    /**
     * Marca job como erro
     * @param jobId ID do job
     * @param errorMessage Mensagem de erro
     */
    markError(jobId: string, errorMessage: string): Promise<void>;

    /**
     * Cancela job
     * @param jobId ID do job
     * @param reason Razão do cancelamento
     */
    cancelJob(jobId: string, reason: string): Promise<void>;

    /**
     * Busca job por ID (opcional, útil para monitoramento)
     * @param jobId ID do job
     * @returns Job ou null
     */
    getJobById?(jobId: string): Promise<TagEncodingJob | null>;

    /**
     * Lista jobs por status (opcional, útil para monitoramento)
     * @param status Status para filtrar
     * @returns Lista de jobs
     */
    getJobsByStatus?(status: string): Promise<TagEncodingJob[]>;
}
