"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceAuth = void 0;
const serviceToken_1 = require("../security/serviceToken");
const serviceAuth = (req, res, next) => {
    const token = req.headers['x-service-token'];
    if (!token) {
        return res.status(403).json({ error: 'Forbidden', message: 'Missing service token' });
    }
    const decoded = (0, serviceToken_1.verifyServiceToken)(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid service token' });
    }
    // Attach service info to request if needed
    req.service = decoded;
    next();
};
exports.serviceAuth = serviceAuth;
