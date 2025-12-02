import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../database/prismaClient';

// 1) Login rate limiter: 5 attempts per 10 minutes per IP
export const loginRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    handler: (req: Request, res: Response) => {
        res.status(429).json({ error: 'Too many login attempts, please try again later.' });
    },
});

// 2) QR/verification rate limiter: 30 requests per minute per IP
export const qrRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    handler: (req: Request, res: Response) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
});

// 3) Audit log middleware (non‑blocking)
export const auditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { AuditLogService } = await import('../services/audit/AuditLogService');
        const auditService = new AuditLogService();
        await auditService.log({
            eventType: 'API_REQUEST',
            severity: 'INFO',
            actorType: (req as any).user ? 'USER' : 'API',
            actorId: (req as any).user?.id ?? 'anonymous',
            payload: {
                method: req.method,
                url: req.originalUrl,
                ip: req.ip,
                body: JSON.stringify(req.body).slice(0, 300),
            }
        });
    } catch (e) {
        console.error('Audit log error:', e);
        // do not block request
    }
    next();
};

// 4) Suspicious activity checker (placeholder)
export const suspiciousActivityChecker = (req: Request, res: Response, next: NextFunction) => {
    // Future implementation: detect multiple consecutive failures per IP
    // For now just pass through
    next();
};
