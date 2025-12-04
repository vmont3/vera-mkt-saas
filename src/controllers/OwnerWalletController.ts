import { Request, Response } from 'express';
import { OwnerWalletService } from '../services/wallet/OwnerWalletService';
import { AuditLogService } from '../services/audit/AuditLogService';
import { OwnershipTransferService } from '../services/ownership/OwnershipTransferService';
import { AuthorityAuditService } from '../services/authority/AuthorityAuditService';

const walletService = new OwnerWalletService();
const auditService = new AuditLogService();
const transferService = new OwnershipTransferService();
const auditAuthorityService = new AuthorityAuditService();

// Define extended request type
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        [key: string]: any;
    };
}

export class OwnerWalletController {

    // --- READ ENDPOINTS ---

    static async getMyAssets(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const assets = await walletService.getMyAssets(userId);

            // Metrics could be incremented here
            // register.owner_wallet_list_assets_total.inc();

            res.json({ success: true, data: assets });
        } catch (error) {
            console.error('Error getting assets:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve assets' });
        }
    }

    static async getAssetDetail(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const { assetId } = req.params;
            const asset = await walletService.getAssetDetailForOwner(userId, assetId);

            if (!asset) {
                return res.status(404).json({ success: false, message: 'Asset not found' });
            }

            res.json({ success: true, data: asset });
        } catch (error) {
            console.error('Error getting asset detail:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve asset details' });
        }
    }

    static async getMyIncidents(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const incidents = await walletService.getMyIncidents(userId);
            res.json({ success: true, data: incidents });
        } catch (error) {
            console.error('Error getting incidents:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve incidents' });
        }
    }

    static async getPendingTransfers(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const transfers = await walletService.getMyPendingTransfers(userId);
            res.json({ success: true, data: transfers });
        } catch (error) {
            console.error('Error getting pending transfers:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve transfers' });
        }
    }

    static async getPendingAudits(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const audits = await walletService.getMyPendingAuthorityAudits(userId);
            res.json({ success: true, data: audits });
        } catch (error) {
            console.error('Error getting pending audits:', error);
            res.status(500).json({ success: false, message: 'Failed to retrieve audits' });
        }
    }

    // --- ACTION ENDPOINTS ---

    static async acceptTransfer(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const { id } = req.params;

            // Verify ownership/target logic is handled in service, but we pass userId to ensure security
            await transferService.acceptTransfer(id, userId);

            await auditService.log({
                eventType: 'OWNER_TRANSFER_ACCEPTED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: userId,
                payload: { transferId: id }
            });

            res.json({ success: true, message: 'Transfer accepted' });
        } catch (error) {
            console.error('Error accepting transfer:', error);
            res.status(500).json({ success: false, message: 'Operation failed' });
        }
    }

    static async rejectTransfer(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const { id } = req.params;

            await transferService.rejectTransfer(id, userId);

            await auditService.log({
                eventType: 'OWNER_TRANSFER_REJECTED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: userId,
                payload: { transferId: id }
            });

            res.json({ success: true, message: 'Transfer rejected' });
        } catch (error) {
            console.error('Error rejecting transfer:', error);
            res.status(500).json({ success: false, message: 'Operation failed' });
        }
    }

    static async approveAudit(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const { id } = req.params;

            await auditAuthorityService.approveAudit(id, userId);

            await auditService.log({
                eventType: 'OWNER_AUDIT_APPROVED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: userId,
                payload: { auditId: id }
            });

            res.json({ success: true, message: 'Audit approved' });
        } catch (error) {
            console.error('Error approving audit:', error);
            res.status(500).json({ success: false, message: 'Operation failed' });
        }
    }

    static async rejectAudit(req: Request, res: Response) {
        try {
            const userId = (req as AuthenticatedRequest).user!.id;
            const { id } = req.params;

            await auditAuthorityService.rejectAudit(id, userId);

            await auditService.log({
                eventType: 'OWNER_AUDIT_REJECTED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: userId,
                payload: { auditId: id }
            });

            res.json({ success: true, message: 'Audit rejected' });
        } catch (error) {
            console.error('Error rejecting audit:', error);
            res.status(500).json({ success: false, message: 'Operation failed' });
        }
    }
}
