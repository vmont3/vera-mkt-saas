"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = exports.attachUser = void 0;
const jwt_1 = require("./jwt");
const rbac_1 = require("./rbac");
const attachUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return next();
    }
    const decoded = (0, jwt_1.verifyAccessToken)(token);
    if (decoded) {
        req.user = decoded;
    }
    next();
};
exports.attachUser = attachUser;
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};
exports.requireAuth = requireAuth;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !(0, rbac_1.checkRole)(req.user.role, roles)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
exports.requireRole = requireRole;
