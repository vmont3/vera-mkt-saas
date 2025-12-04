import { Request, Response } from 'express';
import { prisma } from '../../database/prismaClient';
import { pricingService, ProductType } from '../pricing/PricingService';
import { revenueShareService } from '../revenue-share/RevenueShareService';

export class CheckoutController {

    /**
     * Create a new Order (Mock Checkout Session)
     * POST /billing/checkout
     * Body: { items: [{ type: 'DIGITAL_REGISTRATION', quantity: 5 }] }
     */
    static async createCheckoutSession(req: Request, res: Response) {
        try {
            const userId = (req as any).user?.id;
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'Invalid items' });
            }

            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of items) {
                const price = await pricingService.getPrice(item.type as ProductType); // TODO: Pass partnerId if B2B
                const itemTotal = price * item.quantity;

                totalAmount += itemTotal;
                orderItemsData.push({
                    description: `${item.type} x${item.quantity}`,
                    quantity: item.quantity,
                    unitPrice: price,
                    totalPrice: itemTotal,
                    type: 'PRODUCT', // Simplified for now
                    referenceId: item.assetId // Optional
                });
            }

            const order = await prisma.order.create({
                data: {
                    userId,
                    amount: totalAmount,
                    status: 'PENDING',
                    items: {
                        create: orderItemsData
                    }
                },
                include: { items: true }
            });

            // In a real scenario, we would return a Stripe Session ID here.
            // For now, we return the Order ID.
            res.json({
                orderId: order.id,
                amount: totalAmount,
                status: 'PENDING',
                message: 'Proceed to /billing/webhook/mock-success to simulate payment'
            });

        } catch (error) {
            console.error('Checkout Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    /**
     * Mock Webhook to Simulate Payment Success
     * POST /billing/webhook/mock-success
     * Body: { orderId: "..." }
     */
    static async mockPaymentSuccess(req: Request, res: Response) {
        try {
            const { orderId } = req.body;

            const order = await prisma.order.findUnique({ where: { id: orderId } });
            if (!order) return res.status(404).json({ error: 'Order not found' });
            if (order.status === 'PAID') return res.status(400).json({ error: 'Order already paid' });

            // 1. Update Order Status
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAID' }
            });

            // 2. Trigger Revenue Share
            await revenueShareService.distributeRevenue(orderId);

            // 3. Credit User Wallet (if it's a credit purchase)
            // TODO: Implement Wallet Credit logic here if the item was "CREDITS"

            // 4. Release Tags for Encoding (Payment Enforcement)
            const orderWithItems = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true }
            });

            if (orderWithItems) {
                for (const item of orderWithItems.items) {
                    if (item.referenceId) {
                        // Find queue item for this asset that is awaiting payment
                        const queueItem = await prisma.encoderQueue.findFirst({
                            where: {
                                partnerAssetId: item.referenceId,
                                status: 'AWAITING_PAYMENT'
                            }
                        });

                        if (queueItem) {
                            await prisma.encoderQueue.update({
                                where: { id: queueItem.id },
                                data: { status: 'PENDING' }
                            });
                            console.log(`[Checkout] Released tag encoding job ${queueItem.id} for asset ${item.referenceId}`);
                        }
                    }
                }
            }

            res.json({ status: 'success', message: 'Payment processed and revenue distributed' });

        } catch (error) {
            console.error('Webhook Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
