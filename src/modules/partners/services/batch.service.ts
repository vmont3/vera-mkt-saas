import { prisma } from '../../../database/prismaClient';
import { EventService } from './event.service';
import { AlgorandService } from './anchoring.service'; // Renamed import, though file is same, class changed

const eventService = new EventService();
const anchoringService = new AlgorandService(); // Use new class

export class BatchService {
    async createBatch(partnerId: string, type: string, itemCount: number) {
        const batch = await prisma.partnerBatch.create({
            data: {
                partnerId,
                type: type || 'GENERAL',
                status: 'OPEN',
                itemsCount: itemCount,
            },
        });

        await eventService.emit(partnerId, 'onBatchCreated', { batchId: batch.id });
        return batch;
    }

    async anchorBatch(partnerId: string, batchId: string) {
        const batch = await prisma.partnerBatch.findFirst({
            where: { id: batchId, partnerId },
        });

        if (!batch) throw new Error('Batch not found');
        if (batch.status === 'ANCHORED') throw new Error('Batch already anchored');

        // Perform anchoring
        // We pass the batch ID and maybe a hash of its contents (stubbed as just ID for now)
        const { txId, hash } = await anchoringService.anchor({
            batchId,
            timestamp: new Date().toISOString(),
            partnerId
        });

        const updatedBatch = await prisma.partnerBatch.update({
            where: { id: batchId },
            data: {
                status: 'ANCHORED',
                anchoredHash: hash,
                blockchainTxId: txId,
                anchoredAt: new Date(),
            },
        });

        await eventService.emit(partnerId, 'onBatchAnchored', {
            batchId: batch.id,
            txId,
            hash
        });

        return updatedBatch;
    }

    async listBatches(partnerId: string) {
        return prisma.partnerBatch.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
