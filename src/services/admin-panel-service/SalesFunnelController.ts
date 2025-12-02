import { Request, Response } from 'express';
import { prisma } from '../../database/prismaClient';

export class SalesFunnelController {

    /**
     * Get Abandoned Checkouts (Leads for AI)
     * GET /admin/funnel/abandoned
     * Returns:
     * - Unpaid Orders (> 1h)
     * - Unpaid Tag Requests (> 1h)
     */
    static async getAbandonedCheckouts(req: Request, res: Response) {
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            // 1. Find Abandoned Orders (PENDING > 1h)
            const abandonedOrders = await prisma.order.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lt: oneHourAgo }
                },
                include: {
                    user: {
                        select: { id: true, email: true, kycStatus: true }
                    },
                    items: true
                },
                orderBy: { createdAt: 'desc' }
            });

            // 2. Find Abandoned Tag Requests (AWAITING_PAYMENT > 1h)
            const abandonedTags = await prisma.encoderQueue.findMany({
                where: {
                    status: 'AWAITING_PAYMENT',
                    createdAt: { lt: oneHourAgo }
                },
                include: {
                    partnerAsset: {
                        include: {
                            owner: { select: { id: true, email: true } },
                            partner: { select: { name: true, slug: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Format for AI Consumption
            const leads = [
                ...abandonedOrders.map(o => ({
                    type: 'ORDER',
                    id: o.id,
                    userEmail: o.user.email,
                    amount: o.amount,
                    items: o.items.map(i => i.description).join(', '),
                    abandonedAt: o.createdAt,
                    reason: 'Checkout initiated but not completed'
                })),
                ...abandonedTags.map(t => ({
                    type: 'TAG_REQUEST',
                    id: t.id,
                    userEmail: t.partnerAsset?.owner?.email || 'Unknown (Partner Request)',
                    partner: t.partnerAsset?.partner?.name,
                    assetId: t.partnerAssetId,
                    abandonedAt: t.createdAt,
                    reason: 'Tag requested but payment not confirmed'
                }))
            ];

            res.json({
                count: leads.length,
                leads
            });

        } catch (error) {
            console.error('Sales Funnel Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
