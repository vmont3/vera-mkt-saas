import { Request, Response, NextFunction } from 'express';
import { PartnerService } from '../services/partner.service';

const partnerService = new PartnerService();

export class PartnerController {
    static async createPartner(req: Request, res: Response, next: NextFunction) {
        try {
            const partner = await partnerService.createPartner(req.body);
            res.status(201).json(partner);
        } catch (err) {
            next(err);
        }
    }

    static async registerAsset(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const asset = await partnerService.registerAsset(slug, req.body);
            res.status(201).json(asset);
        } catch (err) {
            next(err);
        }
    }

    static async updateAsset(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug, assetId } = req.params;
            const asset = await partnerService.updateAsset(slug, assetId, req.body);
            res.json(asset);
        } catch (err) {
            next(err);
        }
    }

    static async reviewAsset(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug, assetId } = req.params;
            const asset = await partnerService.reviewAsset(slug, assetId, req.body);
            res.json(asset);
        } catch (err) {
            next(err);
        }
    }

    static async requestSignature(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug, assetId } = req.params;
            const signature = await partnerService.requestSignature(slug, assetId, req.body);
            res.status(201).json(signature);
        } catch (err) {
            next(err);
        }
    }

    static async signatureCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug, signatureId } = req.params;
            const signature = await partnerService.signatureCallback(slug, signatureId, req.body);
            res.json(signature);
        } catch (err) {
            next(err);
        }
    }

    static async createBatch(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const batch = await partnerService.createBatch(slug, req.body);
            res.status(201).json(batch);
        } catch (err) {
            next(err);
        }
    }

    static async anchorBatch(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug, batchId } = req.params;
            const batch = await partnerService.anchorBatch(slug, batchId);
            res.json(batch);
        } catch (err) {
            next(err);
        }
    }

    static async listAssets(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const assets = await partnerService.listAssets(slug);
            res.json(assets);
        } catch (err) {
            next(err);
        }
    }

    static async listBatches(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const batches = await partnerService.listBatches(slug);
            res.json(batches);
        } catch (err) {
            next(err);
        }
    }

    static async listEvents(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const events = await partnerService.listEvents(slug);
            res.json(events);
        } catch (err) {
            next(err);
        }
    }
}
