"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQR = exports.generateDynamicQR = void 0;
const prismaClient_1 = require("../../../database/prismaClient");
const uuid_1 = require("uuid");
const generateDynamicQR = async (req, res) => {
    try {
        const { subjectId } = req.body;
        if (!subjectId) {
            return res.status(400).json({ error: 'subjectId is required' });
        }
        const token = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        await prismaClient_1.prisma.qrToken.create({
            data: {
                subjectId,
                token,
                expiresAt,
            },
        });
        return res.json({ qrUrl: `/qr/${token}`, expiresAt });
    }
    catch (error) {
        console.error('generateDynamicQR error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.generateDynamicQR = generateDynamicQR;
const validateQR = async (req, res) => {
    try {
        const { token } = req.params;
        const qr = await prismaClient_1.prisma.qrToken.findUnique({ where: { token } });
        if (!qr) {
            return res.status(404).json({ error: 'QR token not found' });
        }
        if (qr.expiresAt < new Date()) {
            return res.status(400).json({ error: 'QR token expired' });
        }
        return res.json({ valid: true, subjectId: qr.subjectId });
    }
    catch (error) {
        console.error('validateQR error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.validateQR = validateQR;
