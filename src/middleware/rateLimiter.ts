import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/audit/AuditLogService';

// Simple in-memory store for rate limiting (replace with Redis in production)
const memoryStore: Record<string, { count: number; resetTime: number }> = {};

/**
 * Creates a rate limiter middleware
 * @param limit Max requests per window
 * @param windowMs Window size in milliseconds
 * @param endpointName Name of the endpoint for logging
 */
export const rateLimiter = (limit: number, windowMs: number, endpointName: string = 'generic') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `rate_limit:${endpointName}:${ip}`;
        const now = Date.now();

        if (!memoryStore[key] || now > memoryStore[key].resetTime) {
            memoryStore[key] = {
                count: 1,
                resetTime: now + windowMs
            };
        } else {
            memoryStore[key].count++;
        }

        if (memoryStore[key].count > limit) {
            // Log AuditLog only once per window exceeded to avoid spam
            if (memoryStore[key].count === limit + 1) {
                try {
                    const auditService = new AuditLogService();
                    await auditService.log({
                        eventType: 'RATE_LIMIT_EXCEEDED',
                        severity: 'WARNING',
                        actorType: 'SYSTEM',
                        actorId: 'RateLimiter',
                        payload: {
                            ip,
                            endpoint: endpointName,
                            limit,
                            windowMs
                        }
                    });
                } catch (err) {
                    console.error('Failed to log rate limit exceeded:', err);
                }
            }

            return res.status(429).json({
                error: 'Too Many Requests',
                message: 'Please try again later.'
            });
        }

        next();
    };
};

