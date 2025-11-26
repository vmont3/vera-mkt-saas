"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyServiceToken = exports.generateServiceToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SERVICE_SECRET = process.env.SERVICE_JWT_SECRET || 'service-secret-changeme';
const generateServiceToken = (serviceName) => {
    return jsonwebtoken_1.default.sign({ service: serviceName, type: 'service' }, SERVICE_SECRET, { expiresIn: '1d' });
};
exports.generateServiceToken = generateServiceToken;
const verifyServiceToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, SERVICE_SECRET);
    }
    catch (error) {
        return null;
    }
};
exports.verifyServiceToken = verifyServiceToken;
