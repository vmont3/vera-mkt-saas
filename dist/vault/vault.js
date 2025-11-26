"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieve = exports.store = void 0;
const vaultClient_1 = require("./vaultClient");
// Simulation of a persistent vault using in-memory Map
const memoryVault = new Map();
const store = async (key, value) => {
    const stringValue = JSON.stringify(value);
    const encrypted = (0, vaultClient_1.encrypt)(stringValue);
    memoryVault.set(key, encrypted);
    // In real implementation, this would save to DB
    // console.log(`[Vault] Stored encrypted value for key: ${key}`);
};
exports.store = store;
const retrieve = async (key) => {
    const encrypted = memoryVault.get(key);
    if (!encrypted)
        return null;
    try {
        const decrypted = (0, vaultClient_1.decrypt)(encrypted);
        return JSON.parse(decrypted);
    }
    catch (error) {
        console.error(`[Vault] Error retrieving key ${key}:`, error);
        return null;
    }
};
exports.retrieve = retrieve;
