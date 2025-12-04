import express, { Request, Response, NextFunction } from 'express';
import { TenantManager } from '../core/TenantManager';

export class Gateway {
    private static instance: Gateway;
    private tenantManager: TenantManager;

    private constructor() {
        this.tenantManager = TenantManager.getInstance();
    }

    public static getInstance(): Gateway {
        if (!Gateway.instance) {
            Gateway.instance = new Gateway();
        }
        return Gateway.instance;
    }

    /**
     * Middleware to authenticate requests via API Key.
     * Injects the tenant context into the request object.
     */
    public async authenticate(req: Request, res: Response, next: NextFunction) {
        const apiKey = req.header('X-API-Key');

        if (!apiKey) {
            return res.status(401).json({ error: 'Missing X-API-Key header' });
        }

        const tenant = await TenantManager.getInstance().validateApiKey(apiKey as string);

        if (!tenant) {
            return res.status(403).json({ error: 'Invalid API Key' });
        }

        // Inject tenant context
        (req as any).tenant = tenant;
        next();
    }

    /**
     * Middleware to enforce admin privileges.
     */
    public requireAdmin(req: Request, res: Response, next: NextFunction) {
        const tenant = (req as any).tenant;
        if (!tenant || tenant.settings.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        next();
    }

    /**
     * Global error handler for the Gateway.
     */
    public errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
        console.error('[Gateway Error]', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

// Extend Express Request interface to include tenant
declare global {
    namespace Express {
        interface Request {
            tenant?: any;
        }
    }
}
