import { Request, Response, NextFunction } from 'express';
import { apiLogger, maskSensitive } from '../utils/logger';
import { metrics } from '../utils/metrics';

export const observabilityMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';

    // Hook into response finish to log and record metrics
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        // 1. Log Request
        apiLogger.info('HTTP Request', {
            method,
            path: originalUrl,
            statusCode,
            durationMs: duration,
            ip,
            userAgent,
            // Mask body if present (be careful with large bodies)
            // body: req.body ? maskSensitive(req.body) : undefined 
        });

        // 2. Record Metrics
        // Normalize route to avoid high cardinality (e.g., /users/123 -> /users/:id)
        // Simple heuristic: replace UUIDs/numbers with placeholders
        const route = originalUrl.replace(/\/[0-9a-f-]{36}/g, '/:id').replace(/\/\d+/g, '/:id');

        metrics.http_request_duration_ms.observe(
            { method, route, status_code: statusCode.toString() },
            duration
        );
    });

    next();
};
