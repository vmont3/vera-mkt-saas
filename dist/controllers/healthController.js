"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const healthCheck = (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
};
exports.healthCheck = healthCheck;
