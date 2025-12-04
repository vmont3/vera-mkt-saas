import { Request, Response } from 'express';
import { prisma } from '../../../database/prismaClient';
import { v4 as uuidv4 } from 'uuid';

export const generateDynamicQR = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.body;
        if (!subjectId) {
            return res.status(400).json({ error: 'subjectId is required' });
        }
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await prisma.qrToken.create({
            data: {
                subjectId,
                token,
                expiresAt,
            },
        });
        return res.json({ qrUrl: `/qr/${token}`, expiresAt });
    } catch (error) {
        console.error('generateDynamicQR error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const validateQR = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const qr = await prisma.qrToken.findUnique({ where: { token } });
        if (!qr) {
            return res.status(404).json({ error: 'QR token not found' });
        }
        if (qr.expiresAt < new Date()) {
            return res.status(400).json({ error: 'QR token expired' });
        }
        return res.json({ valid: true, subjectId: qr.subjectId });
    } catch (error) {
        console.error('validateQR error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
