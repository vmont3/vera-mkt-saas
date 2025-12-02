import { PrismaClient, EncoderQueue, Prisma } from "@prisma/client";
import { getPrismaClient } from "../database";

export class EncoderQueueRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async create(data: Prisma.EncoderQueueCreateInput): Promise<EncoderQueue> {
        return this.prisma.encoderQueue.create({
            data
        });
    }

    async findById(id: string): Promise<EncoderQueue | null> {
        return this.prisma.encoderQueue.findUnique({
            where: { id },
            include: { config: true }
        });
    }

    /**
     * Finds the next pending job with the highest priority and marks it as IN_PROCESS.
     * Uses a transaction to ensure atomicity.
     */
    async getNextPending(stationId: string): Promise<EncoderQueue | null> {
        return this.prisma.$transaction(async (tx) => {
            const job = await tx.encoderQueue.findFirst({
                where: { status: "PENDENTE" },
                orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
            });

            if (!job) return null;

            return tx.encoderQueue.update({
                where: { id: job.id },
                data: {
                    status: "EM_PROCESSO",
                    stationId: stationId,
                    startedAt: new Date(),
                },
                include: { config: true }
            });
        });
    }

    async updateStatus(id: string, status: string, stationId?: string): Promise<EncoderQueue> {
        const data: Prisma.EncoderQueueUpdateInput = { status };
        if (stationId) {
            data.station = { connect: { id: stationId } };
        }
        if (status === "EM_PROCESSO") {
            data.startedAt = new Date();
        }

        return this.prisma.encoderQueue.update({
            where: { id },
            data
        });
    }

    async complete(id: string, tagId?: string): Promise<EncoderQueue> {
        return this.prisma.encoderQueue.update({
            where: { id },
            data: {
                status: "SUCESSO",
                completedAt: new Date(),
                tagId: tagId
            }
        });
    }

    async fail(id: string, errorMessage: string): Promise<EncoderQueue> {
        return this.prisma.encoderQueue.update({
            where: { id },
            data: {
                status: "ERRO",
                errorMessage: errorMessage,
                completedAt: new Date(),
            }
        });
    }

    async cancel(id: string, reason: string): Promise<EncoderQueue> {
        return this.prisma.encoderQueue.update({
            where: { id },
            data: {
                status: "CANCELADO",
                errorMessage: reason,
                completedAt: new Date(),
            }
        });
    }

    async getJobsByStatus(status: string): Promise<EncoderQueue[]> {
        return this.prisma.encoderQueue.findMany({
            where: { status },
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        });
    }

    async findPending(stationId?: string): Promise<(EncoderQueue & { config: any })[]> {
        const where: Prisma.EncoderQueueWhereInput = { status: 'PENDING' };
        if (stationId) {
            where.stationId = stationId;
        }

        return this.prisma.encoderQueue.findMany({
            where,
            include: {
                config: true
            },
            orderBy: { priority: 'desc' }
        });
    }
}
