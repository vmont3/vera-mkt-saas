import { Request, Response } from 'express';
import { NftService } from '../services/assets/NftService';
import { auditLog } from '../services/audit/AuditService';
import { nftLimiter } from '../middleware/rateLimiter';

// Adapted for Express
export class NftController {
    private nftService = new NftService();

    async transfer(req: Request, res: Response) {
        const body = req.body;
        // Mock req.user if not present (middleware should attach it)
        const reqWithUser = req as any;

        try {
            const result = await this.nftService.transferAsset(body.assetId, body.toAddress, reqWithUser);
            return res.json(result);
        } catch (error: any) {
            await auditLog('NFT_TRANSFER', reqWithUser.user?.id || 'unknown', 'FAILURE', { error: error.message }, reqWithUser);
            return res.status(403).json({ error: error.message });
        }
    }
}

export const nftController = new NftController();
