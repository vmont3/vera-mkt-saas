"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    const userId = req.user?.userId || 'anonymous';
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        console.log(`[${new Date().toISOString()}] ${method} ${url} ${status} - ${duration}ms - IP: ${ip} - User: ${userId}`);
    });
    next();
};
exports.requestLogger = requestLogger;
