// src/modules/tag-encoding/core/TagEncodingService.ts

import { TagEncodingQueue } from "./TagEncodingQueue";
import { TagEncodingJob } from "../domain/TagEncodingTypes";
import { Ntag424Encoder } from "../encoder/Ntag424Encoder";
import { TagRegistry } from "../../tag-registry/TagRegistry";

/**
 * Serviço de Encoding de Tags - Orquestrador
 * 
 * Responsável por:
 * - Consumir jobs da fila de encoding
 * - Coordenar encoder + queue + KMS
 * - Processar tags em loop (worker)
 * - Gerenciar erros e retries
 */
export class TagEncodingService {
    private isRunning: boolean = false;
    private stopRequested: boolean = false;

    constructor(
        private readonly queue: TagEncodingQueue,
        private readonly encoder: Ntag424Encoder,
        private readonly stationId: string,
        private readonly tagRegistry: TagRegistry
    ) { }

    /**
     * Processa UM job pendente da fila.
     * Pode ser chamado em loop, ou agendado.
     * 
     * @returns true se processou um job, false se não havia jobs pendentes
     */
    async processNextJob(): Promise<boolean> {
        const job = await this.queue.getNextPending(this.stationId);
        if (!job) {
            return false;
        }

        console.log(`[EncodingService] Processando job ${job.id}...`);
        console.log(`[EncodingService] Asset: ${job.assetId}, Tag Internal ID: ${job.tagInternalId}`);

        try {
            await this.queue.markInProcess(job.id, this.stationId);

            // Valida configuração do job antes de processar
            const validation = this.encoder.validateJobConfig(job);
            if (!validation.valid) {
                throw new Error(`Configuração inválida: ${validation.errors.join(", ")}`);
            }

            // Aqui acontece a mágica da personalização única
            console.log(`[EncodingService] Executando encoding...`);
            const result = await this.encoder.encode(job);

            // Salvar UID e criar registro NTAG424Tag no banco
            if (result.uid) {
                console.log(`[EncodingService] UID capturado: ${result.uid}`);
                
                try {
                    const tag = await this.tagRegistry.createTagFromEncodingJob({
                        uid: result.uid,
                        queueJobId: job.id
                    });
                    console.log(`[EncodingService] ✅ Tag criada no Registry: ${tag.id}`);
                } catch (error: any) {
                    console.error(`[EncodingService] ❌ Erro ao criar tag no Registry:`, error);
                    throw new Error(`Falha ao registrar tag: ${error.message}`);
                }
            } else {
                console.warn(`[EncodingService] ⚠️  UID não disponível para job ${job.id}`);
            }

            await this.queue.markSuccess(job.id);
            console.log(`[EncodingService] ✅ Job ${job.id} concluído com sucesso!`);

            return true;
        } catch (error: any) {
            console.error(`[EncodingService] ❌ Erro ao processar job ${job.id}:`, error);
            await this.queue.markError(job.id, error?.message ?? String(error));

            return true; // Processou (com erro)
        }
    }

    /**
     * Processa um job específico por ID
     * Útil para reprocessamento manual
     */
    async processJobById(jobId: string): Promise<void> {
        // Se a queue implementar getJobById, busca o job
        if (this.queue.getJobById) {
            const job = await this.queue.getJobById(jobId);
            if (!job) {
                throw new Error(`Job ${jobId} não encontrado`);
            }

            console.log(`[EncodingService] Reprocessando job ${jobId}...`);

            await this.queue.markInProcess(job.id, this.stationId);

            try {
                const result = await this.encoder.encode(job);
                await this.queue.markSuccess(job.id);
                console.log(`[EncodingService] ✅ Job ${jobId} reprocessado com sucesso!`);
            } catch (error: any) {
                console.error(`[EncodingService] ❌ Erro ao reprocessar job ${jobId}:`, error);
                await this.queue.markError(job.id, error?.message ?? String(error));
                throw error;
            }
        } else {
            throw new Error("Queue não suporta getJobById");
        }
    }

    /**
     * Loop simples, para rodar como "worker".
     * 
     * NOTA: Este loop é simplificado para demonstração.
     * Em produção, você pode substituir por:
     * - Fila distribuída (RabbitMQ, SQS, Redis Queue)
     * - Job scheduler (Bull, Agenda)
     * - Kubernetes CronJob
     * 
     * @param pollIntervalMs Intervalo entre verificações (padrão: 1000ms)
     */
    async startLoop(pollIntervalMs: number = 1000): Promise<void> {
        if (this.isRunning) {
            console.warn("[EncodingService] Loop já está em execução");
            return;
        }

        this.isRunning = true;
        this.stopRequested = false;

        console.log(`[EncodingService] 🚀 Iniciando worker loop...`);
        console.log(`[EncodingService] Station ID: ${this.stationId}`);
        console.log(`[EncodingService] Poll Interval: ${pollIntervalMs}ms`);

        while (!this.stopRequested) {
            try {
                const processed = await this.processNextJob();

                // Se não processou nada, aguarda o intervalo completo
                // Se processou, aguarda só um pouco antes de buscar o próximo
                const waitTime = processed ? 100 : pollIntervalMs;
                await this.sleep(waitTime);
            } catch (error) {
                console.error("[EncodingService] Erro crítico no loop:", error);
                // Aguarda um pouco antes de tentar novamente
                await this.sleep(pollIntervalMs * 2);
            }
        }

        this.isRunning = false;
        console.log("[EncodingService] Loop parado");
    }

    /**
     * Para o loop do worker
     */
    stop(): void {
        console.log("[EncodingService] Solicitando parada do loop...");
        this.stopRequested = true;
    }

    /**
     * Verifica se o worker está em execução
     */
    isWorkerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Helper para sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obtém estatísticas da fila (se suportado pela implementação)
     */
    async getQueueStats(): Promise<{
        pending?: number;
        processing?: number;
        success?: number;
        error?: number;
    } | null> {
        if (!this.queue.getJobsByStatus) {
            return null;
        }

        try {
            const [pending, processing, success, error] = await Promise.all([
                this.queue.getJobsByStatus("PENDENTE"),
                this.queue.getJobsByStatus("EM_PROCESSO"),
                this.queue.getJobsByStatus("SUCESSO"),
                this.queue.getJobsByStatus("ERRO"),
            ]);

            return {
                pending: pending.length,
                processing: processing.length,
                success: success.length,
                error: error.length,
            };
        } catch {
            return null;
        }
    }
}
