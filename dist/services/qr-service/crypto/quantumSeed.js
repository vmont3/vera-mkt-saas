"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateQuantumSeed = getOrCreateQuantumSeed;
const crypto_1 = __importDefault(require("crypto"));
const vault_1 = require("../../../vault/vault");
async function getOrCreateQuantumSeed() {
    const existing = await (0, vault_1.retrieve)('quantum_seed');
    if (existing)
        return existing;
    // Generate cryptographically secure random seed (512 bits)
    const seed = crypto_1.default.randomBytes(64).toString('hex');
    await (0, vault_1.store)('quantum_seed', seed);
    return seed;
}
