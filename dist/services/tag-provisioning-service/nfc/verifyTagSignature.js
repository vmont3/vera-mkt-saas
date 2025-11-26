"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTagSignature = verifyTagSignature;
const crypto_1 = require("../../qr-service/crypto");
const prismaClient_1 = require("../../../database/prismaClient");
async function verifyTagSignature(params) {
    const { uid, hTruncFromTag, integrityFromTag, counterFromTag } = params;
    // Find tag in database
    const tag = await prismaClient_1.prisma.nFCTag.findUnique({ where: { uid } });
    if (!tag) {
        return { valid: false, reason: 'Tag not found' };
    }
    // Check if tag is active
    if (tag.status !== 'active') {
        return { valid: false, reason: `Tag status: ${tag.status}` };
    }
    // Verify h_trunc matches
    if (tag.hTrunc !== hTruncFromTag) {
        return { valid: false, reason: 'Hash mismatch' };
    }
    // Verify integrity code
    const deviceSecret = process.env.DEVICE_SECRET || 'changeme';
    const expectedIntegrity = (0, crypto_1.generateIntegrityCode)(hTruncFromTag, deviceSecret);
    if (expectedIntegrity !== integrityFromTag) {
        return { valid: false, reason: 'Integrity code mismatch' };
    }
    // Check counter (anti-replay)
    if (counterFromTag !== undefined && counterFromTag < tag.counter) {
        return { valid: false, reason: 'Counter replay detected' };
    }
    // Increment verification counter
    await prismaClient_1.prisma.nFCTag.update({
        where: { uid },
        data: { verificationCounter: tag.verificationCounter + 1 },
    });
    return {
        valid: true,
        tagData: {
            subjectId: tag.linkedSubjectId,
            assetId: tag.linkedAssetId,
            status: tag.status,
            verificationCount: tag.verificationCounter + 1,
        },
    };
}
