import { Request, Response } from 'express';
import { prisma } from '../../../database/prismaClient';
import { signTag } from '../nfc/signTag';
import { verifyTagSignature } from '../nfc/verifyTagSignature';
import { buildNTAGPayload } from '../nfc/memoryMap';

// POST /nfc/provision
export const provisionNFCTag = async (req: Request, res: Response) => {
    try {
        const { subjectId, assetId, uid } = req.body;
        const userId = (req as any).user?.id;

        if (!subjectId || !uid) {
            return res.status(400).json({ error: 'subjectId and uid are required' });
        }

        // TODO: Validate user has permission to provision for this subject

        // Check if UID already exists
        const existing = await prisma.nFCTag.findUnique({ where: { uid } });
        if (existing) {
            return res.status(409).json({ error: 'UID already provisioned' });
        }

        // Generate cryptographic data
        const signResult = await signTag({ uid, subjectId, assetId });

        // Create NFCTag record
        const tag = await prisma.nFCTag.create({
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
        const memoryMap = buildNTAGPayload({
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
    } catch (error) {
        console.error('provisionNFCTag error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// POST /nfc/verify
export const verifyNFCTag = async (req: Request, res: Response) => {
    try {
        const { uid, hTrunc, integrityCode, counter } = req.body;

        if (!uid || !hTrunc || !integrityCode) {
            return res.status(400).json({ error: 'uid, hTrunc, and integrityCode are required' });
        }

        const result = await verifyTagSignature({
            uid,
            hTruncFromTag: hTrunc,
            integrityFromTag: integrityCode,
            counterFromTag: counter,
        });

        return res.json(result);
    } catch (error) {
        console.error('verifyNFCTag error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// GET /nfc/:id (public metadata, no sensitive data)
export const getNFCTagMetadata = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tag = await prisma.nFCTag.findUnique({
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
    } catch (error) {
        console.error('getNFCTagMetadata error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
