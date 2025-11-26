"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNFCTagMetadata = exports.verifyNFCTag = exports.provisionNFCTag = void 0;
const prismaClient_1 = require("../../../database/prismaClient");
const signTag_1 = require("../nfc/signTag");
const verifyTagSignature_1 = require("../nfc/verifyTagSignature");
const memoryMap_1 = require("../nfc/memoryMap");
// POST /nfc/provision
const provisionNFCTag = async (req, res) => {
    try {
        const { subjectId, assetId, uid } = req.body;
        const userId = req.user?.id;
        if (!subjectId || !uid) {
            return res.status(400).json({ error: 'subjectId and uid are required' });
        }
        // TODO: Validate user has permission to provision for this subject
        // Check if UID already exists
        const existing = await prismaClient_1.prisma.nFCTag.findUnique({ where: { uid } });
        if (existing) {
            return res.status(409).json({ error: 'UID already provisioned' });
        }
        // Generate cryptographic data
        const signResult = await (0, signTag_1.signTag)({ uid, subjectId, assetId });
        // Create NFCTag record
        const tag = await prismaClient_1.prisma.nFCTag.create({
            data: {
                uid,
                hTrunc: signResult.hTrunc,
                integrityCode: signResult.integrityCode,
                counter: 0,
                linkedSubjectId: subjectId,
                linkedAssetId: assetId || null,
                status: 'active',
            },
        });
        // Build memory map payload for tag writer
        const memoryMap = (0, memoryMap_1.buildNTAGPayload)({
            uid,
            hTrunc: signResult.hTrunc,
            integrityCode: signResult.integrityCode,
            counter: 0,
            tagId: tag.id,
        });
        // TODO: Queue blockchain anchoring job
        // await queueAnchorJob({ tagId: tag.id, hMasterHash: sha3_256(hMaster) });
        return res.json({
            success: true,
            tagId: tag.id,
            memoryMap,
            message: 'Tag provisioned successfully. Write memoryMap to NFC chip.',
        });
    }
    catch (error) {
        console.error('provisionNFCTag error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.provisionNFCTag = provisionNFCTag;
// POST /nfc/verify
const verifyNFCTag = async (req, res) => {
    try {
        const { uid, hTrunc, integrityCode, counter } = req.body;
        if (!uid || !hTrunc || !integrityCode) {
            return res.status(400).json({ error: 'uid, hTrunc, and integrityCode are required' });
        }
        const result = await (0, verifyTagSignature_1.verifyTagSignature)({
            uid,
            hTruncFromTag: hTrunc,
            integrityFromTag: integrityCode,
            counterFromTag: counter,
        });
        return res.json(result);
    }
    catch (error) {
        console.error('verifyNFCTag error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyNFCTag = verifyNFCTag;
// GET /nfc/:id (public metadata, no sensitive data)
const getNFCTagMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await prismaClient_1.prisma.nFCTag.findUnique({
            where: { id },
            select: {
                id: true,
                uid: true,
                status: true,
                linkedSubjectId: true,
                linkedAssetId: true,
                anchorTxId: true,
                verificationCounter: true,
                createdAt: true,
                // NEVER expose: hTrunc, integrityCode, counter
            },
        });
        if (!tag) {
            return res.status(404).json({ error: 'Tag not found' });
        }
        return res.json({
            id: tag.id,
            status: tag.status,
            verified: tag.status === 'active',
            anchorTxId: tag.anchorTxId,
            verificationCount: tag.verificationCounter,
            createdAt: tag.createdAt,
            // TODO: Fetch masked subject data from subject-registry-service
        });
    }
    catch (error) {
        console.error('getNFCTagMetadata error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getNFCTagMetadata = getNFCTagMetadata;
