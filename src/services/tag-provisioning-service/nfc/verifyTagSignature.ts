import { generateIntegrityCode } from '../../qr-service/crypto';
import { prisma } from '../../../database/prismaClient';

export interface VerifyResult {
    valid: boolean;
    reason?: string;
    tagData?: any;
}

export async function verifyTagSignature(params: {
    uid: string;
    hTruncFromTag: string;
    integrityFromTag: string;
    counterFromTag?: number;
}): Promise<VerifyResult> {
    const { uid, hTruncFromTag, integrityFromTag, counterFromTag } = params;

    // Find tag in database
    const tag = await prisma.nFCTag.findUnique({ where: { uid } });
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
    const expectedIntegrity = generateIntegrityCode(hTruncFromTag, deviceSecret);

    if (expectedIntegrity !== integrityFromTag) {
        return { valid: false, reason: 'Integrity code mismatch' };
    }

    // Check counter (anti-replay)
    if (counterFromTag !== undefined && counterFromTag < tag.counter) {
        return { valid: false, reason: 'Counter replay detected' };
    }

    // Increment verification counter
    await prisma.nFCTag.update({
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
