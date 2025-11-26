"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suspiciousActivityChecker = exports.auditLog = exports.qrRateLimiter = exports.loginRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prismaClient_1 = require("../database/prismaClient");
// 1) Login rate limiter: 5 attempts per 10 minutes per IP
exports.loginRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many login attempts, please try again later.' });
    },
});
// 2) QR/verification rate limiter: 30 requests per minute per IP
exports.qrRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    handler: (req, res) => {
        res.status(429).json({ error: 'Too many requests, please try again later.' });
    },
});
// 3) Audit log middleware (non‑blocking)
const auditLog = async (req, res, next) => {
    try {
        await prismaClient_1.prisma.auditLog.create({
            data: {
                actorId: req.user?.id ?? 'anonymous',
                action: req.method,
                details: {
                    service: req.originalUrl,
                    ip: req.ip,
                    body: JSON.stringify(req.body).slice(0, 300),
                },
            },
        });
    }
    catch (e) {
        console.error('Audit log error:', e);
        // do not block request
    }
    next();
};
exports.auditLog = auditLog;
// 4) Suspicious activity checker (placeholder)
const suspiciousActivityChecker = (req, res, next) => {
    // Future implementation: detect multiple consecutive failures per IP
    // For now just pass through
    next();
};
exports.suspiciousActivityChecker = suspiciousActivityChecker;
