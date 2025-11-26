import { Request, Response, NextFunction } from 'express';

// Placeholder for Redis client
const redisClient = {
    get: async (key: string) => null,
    set: async (key: string, value: any, mode?: string, duration?: number) => { },
    incr: async (key: string) => 1,
    expire: async (key: string, seconds: number) => { },
};

export const rateLimiter = (limit: number, windowMs: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = `rate_limit:${ip}`;

        try {
            // Simple counter implementation simulation
            // In production, this would use the real Redis client
            const current = await redisClient.incr(key);

            if (current === 1) {
                await redisClient.expire(key, windowMs / 1000);
            }

            if (current > limit) {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Please try again later.'
                });
            }

            next();
        } catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open if Redis is down
            next();
        }
    };
};
