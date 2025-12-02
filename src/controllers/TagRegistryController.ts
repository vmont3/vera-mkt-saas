import { Request, Response } from 'express';
import { TagRegistryService } from '../services/tag-registry/TagRegistryService';
import { EncoderQueueRepository } from '../repositories/EncoderQueueRepository';

export class TagRegistryController {
    private static tagRegistryService = new TagRegistryService();
    private static encoderQueueRepository = new EncoderQueueRepository();

    /**
     * POST /v1/quantum-cert/registry/assets
     * Register a new asset and generate Falcon master hash
     */
    static async registerAsset(req: Request, res: Response) {
        try {
            const {
                type,
                category,
                metadata,
                linkedSubjectId,
                partnerAssetId
            } = req.body;

            const result = await TagRegistryController.tagRegistryService.registerAsset({
                type,
                category,
                metadata,
                linkedSubjectId,
                partnerAssetId,
                ownerId: (req as any).user?.id
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Register asset error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /v1/quantum-cert/registry/prepare-encoding
     * Prepare asset for encoding (Generate Config + Queue Item)
     */
    static async prepareEncoding(req: Request, res: Response) {
        try {
            const {
                assetType,
                assetCategory,
                linkedSubjectId,
                partnerAssetId,
                configDescription,
                stationId
            } = req.body;

            const result = await TagRegistryController.tagRegistryService.prepareAssetForEncoding({
                assetType,
                assetCategory,
                linkedSubjectId,
                partnerAssetId,
                configDescription: configDescription || `Config for ${assetType}`,
                operatorId: (req as any).user?.id,
                stationId
            });

            res.status(201).json(result);
        } catch (error: any) {
            console.error('Prepare encoding error:', error);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * GET /v1/quantum-cert/registry/queue
     * List pending encoding jobs
     */
    static async listEncodingQueue(req: Request, res: Response) {
        try {
            const { stationId } = req.query;

            const queue = await TagRegistryController.encoderQueueRepository.findPending(
                stationId ? String(stationId) : undefined
            );

            res.json(queue);
        } catch (error: any) {
            console.error('List queue error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
