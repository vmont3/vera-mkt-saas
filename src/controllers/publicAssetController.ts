import { Request, Response } from 'express';
import { PublicAssetService } from '../services/public/PublicAssetService';

const publicAssetService = new PublicAssetService();

export const getPublicAsset = async (req: Request, res: Response) => {
    try {
        const { publicId } = req.params;
        const ip = req.ip || req.socket.remoteAddress;

        const asset = await publicAssetService.getPublicAsset(publicId, ip);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        // Caching Headers
        res.set('Cache-Control', 'public, max-age=20');
        res.set('ETag', `W/"${asset.updatedAt.getTime()}"`);

        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getPublicAssetIncidents = async (req: Request, res: Response) => {
    try {
        const { publicId } = req.params;
        const ip = req.ip || req.socket.remoteAddress;

        const asset = await publicAssetService.getPublicAsset(publicId, ip);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.set('Cache-Control', 'public, max-age=20');
        res.json(asset.incidents);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getPublicAssetAnchors = async (req: Request, res: Response) => {
    try {
        const { publicId } = req.params;
        const ip = req.ip || req.socket.remoteAddress;

        const asset = await publicAssetService.getPublicAsset(publicId, ip);

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.set('Cache-Control', 'public, max-age=20');
        res.json(asset.anchors);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
