"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
// Placeholder for Redis client
const redisClient = {
    get: async (key) => null,
    set: async (key, value, mode, duration) => { },
    incr: async (key) => 1,
    expire: async (key, seconds) => { },
};
const rateLimiter = (limit, windowMs) => {
    return async (req, res, next) => {
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
        }
        catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open if Redis is down
            next();
        }
    };
};
exports.rateLimiter = rateLimiter;
