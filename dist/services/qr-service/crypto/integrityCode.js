"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIntegrityCode = generateIntegrityCode;
const crypto_1 = __importDefault(require("crypto"));
function generateIntegrityCode(truncatedHash, deviceSecret) {
    return crypto_1.default
        .createHmac('sha256', deviceSecret)
        .update(truncatedHash)
        .digest('hex');
}
