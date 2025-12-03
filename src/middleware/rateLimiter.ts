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
        // Rate Limiting Disabled for Hive Architecture (Admin/System priority)
        next();
    };
};

