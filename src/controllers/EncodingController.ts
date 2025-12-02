import { Request, Response } from 'express';
import { TagRegistryService } from '../services/tag-registry/TagRegistryService';

export class EncodingController {
    private static tagRegistryService = new TagRegistryService();

    /**
     * POST /v1/quantum-cert/encode/start
     * Start a new encoding job
     */
    static async startEncoding(req: Request, res: Response) {
        try {
            const {
                assetType,
                assetCategory,
                linkedSubjectId,
                partnerAssetId,
                configDescription,
                stationId
            } = req.body;

            // Validation
            if (!assetType) {
                return res.status(400).json({ error: 'assetType is required' });
            }
            if (!stationId) {
                return res.status(400).json({ error: 'stationId is required' });
            }

            // Create encoding job via TagRegistryService
            const result = await EncodingController.tagRegistryService.prepareAssetForEncoding({
                assetType,
                assetCategory: assetCategory || assetType,
                linkedSubjectId,
                partnerAssetId,
                configDescription: configDescription || `Encoding for ${assetType}`,
                operatorId: (req as any).user?.id,
                stationId
            });

            res.status(201).json({
                jobId: result.queueItem.id,
                configId: result.config.id,
                masterHashVaultKey: result.masterHashVaultKey,
                hashTruncated: result.hashTruncated,
                status: result.queueItem.status,
                createdAt: result.queueItem.createdAt
            });
        } catch (error: any) {
            console.error('[EncodingController] Start encoding error:', error);
            res.status(500).json({ error: error.message || 'Failed to start encoding' });
        }
    }

    /**
     * GET /v1/quantum-cert/encode/status/:jobId
     * Get encoding job status
     */
    static async getStatus(req: Request, res: Response) {
        try {
            const { jobId } = req.params;

            if (!jobId) {
                return res.status(400).json({ error: 'jobId is required' });
            }

            const { prisma } = await import('../database/prismaClient');

            const job = await prisma.encoderQueue.findUnique({
                where: { id: jobId },
                include: {
                    config: true,
                    station: true
                }
            });

            if (!job) {
                return res.status(404).json({ error: 'Job not found' });
            }

            // Calculate progress
            let progress = 0;
            switch (job.status) {
                case 'PENDING':
                    progress = 0;
                    break;
                case 'IN_PROCESS':
                    progress = 50;
                    break;
                case 'SUCCESS':
                    progress = 100;
                    break;
                case 'ERROR':
                    progress = job.startedAt ? 50 : 0;
                    break;
            }

            res.json({
                jobId: job.id,
                status: job.status,
                progress,
                stationId: job.stationId,
                stationName: job.station?.name,
                tagId: job.tagId,
                encodedUid: job.encodedUid,
                errorMessage: job.errorMessage,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt
            });
        } catch (error: any) {
            console.error('[EncodingController] Get status error:', error);
            res.status(500).json({ error: error.message || 'Failed to get job status' });
        }
    }

    /**
     * GET /v1/quantum-cert/encode/queue
     * List pending encoding jobs (admin)
     */
    static async listQueue(req: Request, res: Response) {
        try {
            const { stationId, status } = req.query;

            const { prisma } = await import('../database/prismaClient');

            const where: any = {};
            if (stationId) where.stationId = String(stationId);
            if (status) where.status = String(status);

            const jobs = await prisma.encoderQueue.findMany({
                where,
                include: {
                    config: true,
                    station: true
                },
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' }
                ],
                take: 50
            });

            res.json({
                total: jobs.length,
                jobs: jobs.map((job: any) => ({
                    jobId: job.id,
                    status: job.status,
                    priority: job.priority,
                    stationId: job.stationId,
                    tagId: job.tagId,
                    createdAt: job.createdAt,
                    startedAt: job.startedAt,
                    completedAt: job.completedAt
                }))
            });
        } catch (error: any) {
            console.error('[EncodingController] List queue error:', error);
            res.status(500).json({ error: error.message || 'Failed to list queue' });
        }
    }
}
