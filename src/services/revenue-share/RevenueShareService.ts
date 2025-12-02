import { prisma } from '../../database/prismaClient';
import { ProductType } from '../pricing/PricingService';

export class RevenueShareService {
    private static readonly COMMISSION_RATE = 0.05; // 5%
    private static readonly SETTLEMENT_DAYS = 30;

    /**
     * Distribute revenue for a completed order.
     * Creates PENDING commissions for Referrer, Manufacturer, and Retailer.
     */
    async distributeRevenue(orderId: string) {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: true
            }
        });

        if (!order || order.status !== 'PAID') {
            throw new Error('Order not found or not paid');
        }

        const settlementDate = new Date();
        settlementDate.setDate(settlementDate.getDate() + RevenueShareService.SETTLEMENT_DAYS);

        await prisma.$transaction(async (tx) => {
            // 1. Process Referral Commission (User -> Referrer)
            if (order.user.referredBy) {
                const referrer = await tx.user.findUnique({
                    where: { referralCode: order.user.referredBy }
                });

                if (referrer) {
                    const commissionAmount = order.amount * RevenueShareService.COMMISSION_RATE;
                    await tx.commission.create({
                        data: {
                            orderId: order.id,
                            userId: referrer.id,
                            type: 'REFERRAL',
                            amount: commissionAmount,
                            status: 'PENDING',
                            availableAt: settlementDate
                        }
                    });
                }
            }

            // 2. Process Asset-based Commissions (Manufacturer & Retailer)
            // We need to look at order items to find related assets
            for (const item of order.items) {
                if (item.referenceId && (item.type === 'PRODUCT' || item.type === 'SERVICE')) {
                    const asset = await tx.partnerAsset.findUnique({
                        where: { id: item.referenceId },
                        include: { partner: true }
                    });

                    if (asset) {
                        const itemRevenue = item.totalPrice;

                        // Manufacturer Commission (The Partner who created the asset)
                        if (asset.partnerId) {
                            const manufacturerCommission = itemRevenue * RevenueShareService.COMMISSION_RATE;
                            await tx.commission.create({
                                data: {
                                    orderId: order.id,
                                    partnerId: asset.partnerId,
                                    type: 'MANUFACTURER',
                                    amount: manufacturerCommission,
                                    status: 'PENDING',
                                    availableAt: settlementDate
                                }
                            });
                        }

                        // Retailer Commission (If applicable, e.g., stored in metadata or batch)
                        // Assuming 'retailerId' might be in metadata for now, or we link it differently later.
                        // For now, let's check if there's a specific retailer linked.
                        const meta = asset.metadata as any;
                        if (meta && meta.retailerPartnerId) {
                            const retailerCommission = itemRevenue * RevenueShareService.COMMISSION_RATE;
                            await tx.commission.create({
                                data: {
                                    orderId: order.id,
                                    partnerId: meta.retailerPartnerId,
                                    type: 'RETAILER',
                                    amount: retailerCommission,
                                    status: 'PENDING',
                                    availableAt: settlementDate
                                }
                            });
                        }
                    }
                }
            }
        });
    }
}

export const revenueShareService = new RevenueShareService();
