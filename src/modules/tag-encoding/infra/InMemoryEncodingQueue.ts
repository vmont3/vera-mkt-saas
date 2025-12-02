// src/modules/tag-encoding/infra/InMemoryEncodingQueue.ts

import { TagEncodingQueue } from "../core/TagEncodingQueue";
import { TagEncodingJob } from "../domain/TagEncodingTypes";
import { randomUUID } from "crypto";

/**
 * Implementação em memória da fila de encoding
 * Ideal para desenvolvimento, testes e Antigravity
 * 
 * ATENÇÃO: Dados são perdidos ao reiniciar a aplicação
 * Para produção, usar PrismaEncodingQueue
 */
export class InMemoryEncodingQueue implements TagEncodingQueue {
    private jobs: TagEncodingJob[] = [];

    async enqueue(
        payload: Omit<TagEncodingJob, "id" | "status" | "attempts" | "createdAt" | "updatedAt">
    ): Promise<TagEncodingJob> {
        const job: TagEncodingJob = {
            ...payload,
            id: randomUUID(),
            status: "PENDENTE",
            attempts: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.jobs.push(job);
        return job;
    }

    async getNextPending(stationId: string): Promise<TagEncodingJob | null> {
        const job = this.jobs.find(j => j.status === "PENDENTE");
        if (!job) return null;
        await this.markInProcess(job.id, stationId);
        return job;
    }

    async markInProcess(jobId: string, stationId: string): Promise<void> {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;
        job.status = "EM_PROCESSO";
        job.encoderStationId = stationId;
        job.attempts += 1;
        job.updatedAt = new Date();
    }

    async markSuccess(jobId: string): Promise<void> {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;
        job.status = "SUCESSO";
        job.updatedAt = new Date();
    }

    async markError(jobId: string, errorMessage: string): Promise<void> {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;
        job.status = "ERRO";
        job.lastError = errorMessage;
        job.updatedAt = new Date();
    }

    async cancelJob(jobId: string, reason: string): Promise<void> {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;
        job.status = "CANCELADO";
        job.lastError = reason;
        job.updatedAt = new Date();
    }

    // Métodos opcionais para monitoramento
    async getJobById(jobId: string): Promise<TagEncodingJob | null> {
        const job = this.jobs.find(j => j.id === jobId);
        return job || null;
    }

    async getJobsByStatus(status: string): Promise<TagEncodingJob[]> {
        return this.jobs.filter(j => j.status === status);
    }

    /**
     * Método auxiliar para limpar a fila (útil para testes)
     */
    clear(): void {
        this.jobs = [];
    }

    /**
     * Método auxiliar para obter todos os jobs (útil para debug)
     */
    getAllJobs(): TagEncodingJob[] {
        return [...this.jobs];
    }
}
