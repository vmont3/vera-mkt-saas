import { Request, Response } from 'express';
import { AuthorityAuditService } from '../services/authority/AuthorityAuditService';

const auditService = new AuthorityAuditService();

export const requestAudit = async (req: Request, res: Response) => {
    try {
        const { assetId, reason } = req.body;
        const requesterId = (req as any).user.id;
        // In a real system, we'd check if user.role is 'AUTHORITY' or 'DELEGATE' here

        const request = await auditService.requestAudit(assetId, requesterId, reason);
        res.status(201).json(request);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const approveAudit = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.body;
        const ownerId = (req as any).user.id;

        const result = await auditService.approveAudit(requestId, ownerId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const rejectAudit = async (req: Request, res: Response) => {
    try {
        const { requestId } = req.body;
        const ownerId = (req as any).user.id;

        const result = await auditService.rejectAudit(requestId, ownerId);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getAuditData = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const ip = req.ip || req.socket.remoteAddress;

        const data = await auditService.getAuditData(token, ip);
        res.json(data);
    } catch (error: any) {
        res.status(403).json({ error: error.message });
    }
};
