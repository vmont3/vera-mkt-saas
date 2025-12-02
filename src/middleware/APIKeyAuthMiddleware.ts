import { Request, Response, NextFunction } from 'express';
import { APIKeyService } from '../services/auth/APIKeyService';
import { AuditLogService } from '../services/audit/AuditLogService';

const apiKeyService = new APIKeyService();
const auditLogService = new AuditLogService();

declare global {
    namespace Express {
        interface Request {
            partner?: {
                id: string;
                scopes: string[];
            };
        }
    }
}

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('X-QC-Api-Key');

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API Key' });
    }

    try {
        const keyData = await apiKeyService.validateKey(apiKey);

        if (!keyData) {
            // Log failed attempt
            await auditLogService.log({
                eventType: 'API_KEY_AUTH_FAILURE',
                severity: 'WARNING',
                actorType: 'PUBLIC',
                actorId: 'anonymous',
                payload: {
                    ip: req.ip,
                    path: req.path,
                    method: req.method
                }
            });
            return res.status(401).json({ error: 'Invalid or expired API Key' });
        }

        // Attach partner context
        req.partner = {
            id: keyData.partnerId,
            scopes: keyData.scopes
        };

        next();
    } catch (error) {
        console.error('API Key Auth Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Scope enforcement middleware
 */
export const requireScope = (requiredScope: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.partner) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const partnerScopes = req.partner.scopes || [];

        // Admin scope bypasses all checks
        if (partnerScopes.includes('admin')) {
            return next();
        }

        if (Array.isArray(requiredScope)) {
            // Check if has ANY of the required scopes
            const hasScope = requiredScope.some(scope => partnerScopes.includes(scope));
            if (!hasScope) {
                return res.status(403).json({ error: `Missing required scope: ${requiredScope.join(' or ')}` });
            }
        } else {
            if (!partnerScopes.includes(requiredScope)) {
                return res.status(403).json({ error: `Missing required scope: ${requiredScope}` });
            }
        }

        next();
    };
};
