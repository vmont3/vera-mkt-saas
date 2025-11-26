"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.generateRefreshToken = exports.verifyAccessToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET || 'changeme';
const generateAccessToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ userId, role }, SECRET, { expiresIn: '1h', algorithm: 'HS256' });
};
exports.generateAccessToken = generateAccessToken;
const verifyAccessToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, SECRET, { algorithms: ['HS256'] });
    }
    catch (error) {
        return null;
    }
};
exports.verifyAccessToken = verifyAccessToken;
const generateRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, SECRET, { expiresIn: '7d', algorithm: 'HS256' });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyRefreshToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, SECRET, { algorithms: ['HS256'] });
    }
    catch (error) {
        return null;
    }
};
exports.verifyRefreshToken = verifyRefreshToken;
