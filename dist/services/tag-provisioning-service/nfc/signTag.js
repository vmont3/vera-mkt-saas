"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signTag = signTag;
const crypto_1 = require("../../qr-service/crypto");
const vault_1 = require("../../../vault/vault");
async function signTag(params) {
    const { uid, subjectId, assetId, targetBits = 128 } = params;
    // Get quantum seed from vault
    const quantumSeed = await (0, crypto_1.getOrCreateQuantumSeed)();
    // Generate h_master (NEVER written to tag or DB)
    const hMaster = (0, crypto_1.generateMasterHash)(quantumSeed, uid, subjectId, assetId);
    // Generate h_trunc (written to tag)
    const hTrunc = (0, crypto_1.generateTruncatedHash)(hMaster, targetBits);
    // Generate integrity code
    const deviceSecret = process.env.DEVICE_SECRET || 'changeme';
    const integrityCode = (0, crypto_1.generateIntegrityCode)(hTrunc, deviceSecret);
    // Store h_master in vault (NEVER on tag or DB)
    const vaultKey = `nfc_master_${uid}`;
    await (0, vault_1.store)(vaultKey, hMaster);
    return {
        hTrunc,
        integrityCode,
        memoryMapPayload: { hTrunc, integrityCode },
        vaultKey,
    };
}
