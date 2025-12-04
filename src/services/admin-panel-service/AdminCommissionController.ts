import { Request, Response } from 'express';
import { prisma } from '../../database/prismaClient';

export class AdminCommissionController {

    /**
     * List all commissions with filters
     * GET /admin/commissions?status=PENDING&userId=...
     */
    static async listCommissions(req: Request, res: Response) {
        try {
            const { status, userId, partnerId, page = 1, limit = 20 } = req.query;
            const skip = (Number(page) - 1) * Number(limit);

            const where: any = {};
            if (status) where.status = String(status);
            if (userId) where.userId = String(userId);
            if (partnerId) where.partnerId = String(partnerId);

            const [commissions, total] = await Promise.all([
                prisma.commission.findMany({
                    where,
                    include: {
                        user: { select: { email: true, referralCode: true } },
                        partner: { select: { name: true, slug: true } },
                        order: { select: { id: true, amount: true, status: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: Number(limit)
                }),
                prisma.commission.count({ where })
            ]);

            res.json({
                data: commissions,
                meta: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit))
                }
            });

        } catch (error) {
            console.error('List Commissions Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Cancel a commission (Fraud Prevention)
     * POST /admin/commissions/:id/cancel
     */
    static async cancelCommission(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const commission = await prisma.commission.findUnique({ where: { id } });
            if (!commission) return res.status(404).json({ error: 'Commission not found' });
            if (commission.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING commissions can be cancelled' });

            await prisma.commission.update({
                where: { id },
                data: { status: 'CANCELLED' }
            });

            res.json({ status: 'success', message: 'Commission cancelled' });

        } catch (error) {
            console.error('Cancel Commission Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Manually release a commission (Early Release)
     * POST /admin/commissions/:id/release
     */
    static async releaseCommission(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const commission = await prisma.commission.findUnique({ where: { id } });
            if (!commission) return res.status(404).json({ error: 'Commission not found' });
            if (commission.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING commissions can be released' });

            await prisma.$transaction(async (tx) => {
                // 1. Update Commission Status
                await tx.commission.update({
                    where: { id },
                    data: { status: 'AVAILABLE' }
                });

                // 2. Credit Wallet
                if (commission.userId) {
                    await tx.wallet.upsert({
                        where: { userId: commission.userId },
                        create: { userId: commission.userId, moneyAvailable: commission.amount },
                        update: { moneyAvailable: { increment: commission.amount } }
                    });
                }
                // TODO: Handle Partner Wallet if separate
            });

            res.json({ status: 'success', message: 'Commission released and wallet credited' });

        } catch (error) {
            console.error('Release Commission Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
