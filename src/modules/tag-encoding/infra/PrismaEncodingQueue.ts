import { TagEncodingQueue } from "../core/TagEncodingQueue";
import { TagEncodingJob, EncodingJobStatus } from "../domain/TagEncodingTypes";
import { EncoderQueueRepository } from "../../../repositories/EncoderQueueRepository";
import { getPrismaClient } from "../../../database";

/**
 * Implementação da fila de encoding usando PostgreSQL via Prisma (Repository Pattern)
 * 
 * Utiliza o EncoderQueueRepository para acesso a dados.
 */
export class PrismaEncodingQueue implements TagEncodingQueue {
    private repository: EncoderQueueRepository;

    constructor(repository?: EncoderQueueRepository) {
        this.repository = repository || new EncoderQueueRepository();
    }

    async enqueue(
        payload: Omit<TagEncodingJob, "id" | "status" | "attempts" | "createdAt" | "updatedAt">
    ): Promise<TagEncodingJob> {
        const dbJob = await this.repository.create({
            config: { connect: { id: payload.assetId } }, // Assuming assetId is configId for now
            masterHashVaultKey: payload.falconMasterId,
            hashTruncated: payload.truncatedHash,
            sdmPayload: {
                tagInternalId: payload.tagInternalId,
                assetType: payload.assetType,
                urlBase: payload.urlBase,
                sdmEncOffset: payload.sdmEncOffset,
                sdmEncLength: payload.sdmEncLength,
                sdmReadCtrOffset: payload.sdmReadCtrOffset,
                sdmMacOffset: payload.sdmMacOffset,
                sdmMacInputOffset: payload.sdmMacInputOffset,
            },
            status: "PENDENTE",
            priority: 0,
        });

        return this.mapToTagEncodingJob(dbJob);
    }

    async getNextPending(stationId: string): Promise<TagEncodingJob | null> {
        const dbJob = await this.repository.getNextPending(stationId);
        if (!dbJob) return null;
        return this.mapToTagEncodingJob(dbJob);
    }

    async markInProcess(jobId: string, stationId: string): Promise<void> {
        await this.repository.updateStatus(jobId, "EM_PROCESSO", stationId);
    }

    async markSuccess(jobId: string): Promise<void> {
        await this.repository.complete(jobId);
    }

    async markError(jobId: string, errorMessage: string): Promise<void> {
        await this.repository.fail(jobId, errorMessage);
    }

    async cancelJob(jobId: string, reason: string): Promise<void> {
        await this.repository.cancel(jobId, reason);
    }

    // Métodos opcionais para monitoramento
    async getJobById(jobId: string): Promise<TagEncodingJob | null> {
        const dbJob = await this.repository.findById(jobId);
        if (!dbJob) return null;
        return this.mapToTagEncodingJob(dbJob);
    }

    async getJobsByStatus(status: string): Promise<TagEncodingJob[]> {
        const dbJobs = await this.repository.getJobsByStatus(status);
        return dbJobs.map(this.mapToTagEncodingJob);
    }

    /**
     * Mapeia EncoderQueue do Prisma para TagEncodingJob
     */
    private mapToTagEncodingJob(dbJob: any): TagEncodingJob {
        const sdmPayload = dbJob.sdmPayload as any;

        return {
            id: dbJob.id,
            assetId: dbJob.configId,
            tagInternalId: sdmPayload.tagInternalId || "",
            assetType: sdmPayload.assetType || "OUTRO",
            falconMasterId: dbJob.masterHashVaultKey,
            truncatedHash: dbJob.hashTruncated,
            urlBase: sdmPayload.urlBase || "",
            sdmEncOffset: sdmPayload.sdmEncOffset || 0,
            sdmEncLength: sdmPayload.sdmEncLength || 0,
            sdmReadCtrOffset: sdmPayload.sdmReadCtrOffset || 0,
            sdmMacOffset: sdmPayload.sdmMacOffset || 0,
            sdmMacInputOffset: sdmPayload.sdmMacInputOffset || 0,
            status: this.mapDbStatusToJobStatus(dbJob.status),
            attempts: 0, // EncoderQueue não tem campo attempts - considere adicionar no schema
            lastError: dbJob.errorMessage || null,
            encoderStationId: dbJob.stationId || null,
            createdAt: dbJob.createdAt,
            updatedAt: new Date(), // EncoderQueue não tem updatedAt explícito
        };
    }

    /**
     * Mapeia status do banco para EncodingJobStatus
     */
    private mapDbStatusToJobStatus(dbStatus: string): EncodingJobStatus {
        const statusMap: Record<string, EncodingJobStatus> = {
            PENDENTE: "PENDENTE",
            PENDING: "PENDENTE",
            EM_PROCESSO: "EM_PROCESSO",
            PROCESSING: "EM_PROCESSO",
            SUCESSO: "SUCESSO",
            SUCCESS: "SUCESSO",
            COMPLETED: "SUCESSO",
            ERRO: "ERRO",
            ERROR: "ERRO",
            FAILED: "ERRO",
            CANCELADO: "CANCELADO",
            CANCELLED: "CANCELADO",
        };

        return statusMap[dbStatus] || "PENDENTE";
    }

    /**
     * Cleanup - fecha conexão Prisma se necessário
     */
    async disconnect(): Promise<void> {
        // Repository handles connection, nothing to do here unless we want to close the global client
    }
}
