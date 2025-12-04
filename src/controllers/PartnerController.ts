import { Request, Response } from 'express';
import { APIKeyService } from '../services/auth/APIKeyService';
import { AuditLogService } from '../services/audit/AuditLogService';

const apiKeyService = new APIKeyService();
const auditLogService = new AuditLogService();

// Define extended request type locally or import if available
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        [key: string]: any;
    };
}

export class PartnerController {
    /**
     * Create a new API Key for a partner
     */
    static async createKey(req: Request, res: Response) {
        try {
            const { partnerId } = req.params;
            const { name, scopes, expiresAt } = req.body;
            const authReq = req as AuthenticatedRequest;

            if (!name || !scopes || !Array.isArray(scopes)) {
                return res.status(400).json({ error: 'Invalid request body. Name and scopes (array) are required.' });
            }

            const result = await apiKeyService.generateKey(partnerId, name, scopes, expiresAt ? new Date(expiresAt) : undefined);

            // Audit Log
            await auditLogService.log({
                eventType: 'PARTNER_API_KEY_CREATED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: authReq.user?.id || 'admin',
                payload: { partnerId, keyName: name, scopes }
            });

            res.status(201).json(result);
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * List API Keys for a partner
     */
    static async listKeys(req: Request, res: Response) {
        try {
            const { partnerId } = req.params;
            const keys = await apiKeyService.listKeys(partnerId);

            const safeKeys = keys.map(k => ({
                id: k.id,
                name: k.name,
                scopes: k.scopes,
                active: k.active,
                createdAt: k.createdAt,
                lastUsedAt: k.lastUsedAt,
                expiresAt: k.expiresAt,
                prefix: 'qc_live_...'
            }));

            res.json(safeKeys);
        } catch (error) {
            console.error('Error listing API keys:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Rotate an API Key
     */
    static async rotateKey(req: Request, res: Response) {
        try {
            const { keyId } = req.params;
            const { expiresAt } = req.body;
            const authReq = req as AuthenticatedRequest;

            const result = await apiKeyService.rotateKey(keyId, expiresAt ? new Date(expiresAt) : undefined);

            // Audit Log
            await auditLogService.log({
                eventType: 'PARTNER_API_KEY_ROTATED',
                severity: 'INFO',
                actorType: 'USER',
                actorId: authReq.user?.id || 'admin',
                payload: { keyId }
            });

            res.json(result);
        } catch (error) {
            console.error('Error rotating API key:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Revoke an API Key
     */
    static async revokeKey(req: Request, res: Response) {
        try {
            const { keyId } = req.params;
            const authReq = req as AuthenticatedRequest;

            await apiKeyService.revokeKey(keyId);

            // Audit Log
            await auditLogService.log({
                eventType: 'PARTNER_API_KEY_REVOKED',
                severity: 'WARNING',
                actorType: 'USER',
                actorId: authReq.user?.id || 'admin',
                payload: { keyId }
            });

            res.json({ message: 'Key revoked successfully' });
        } catch (error) {
            console.error('Error revoking API key:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
