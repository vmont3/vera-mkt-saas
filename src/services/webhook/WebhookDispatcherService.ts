import { prisma } from '../../database/prismaClient';
import crypto from 'crypto';
import axios from 'axios';
import { AuditLogService } from '../audit/AuditLogService';

export class WebhookDispatcherService {
    private auditService: AuditLogService;

    constructor() {
        this.auditService = new AuditLogService();
    }

    /**
     * Queue an event for delivery to all matching subscriptions
     */
    async queueEvent(eventType: string, payload: any, context?: { partnerId?: string }) {
        try {
            // 1. Find matching subscriptions
            // Matches if:
            // - Subscription is active
            // - eventType is in subscription.eventTypes
            // - partnerId matches OR subscription is global (partnerId is null)
            const subscriptions = await prisma.webhookSubscription.findMany({
                where: {
                    active: true,
                    OR: [
                        { partnerId: context?.partnerId },
                        { partnerId: null }
                    ]
                }
            });

            // Filter by eventType in memory (since JSON array filtering can be tricky across DBs)
            const matchingSubs = subscriptions.filter(sub => {
                const types = sub.eventTypes as string[];
                return types.includes(eventType) || types.includes('*');
            });

            if (matchingSubs.length === 0) return;

            // 2. Create Deliveries
            await prisma.webhookDelivery.createMany({
                data: matchingSubs.map(sub => ({
                    subscriptionId: sub.id,
                    eventType,
                    payload,
                    status: 'PENDING',
                    attempts: 0,
                    nextAttemptAt: new Date() // Ready immediately
                }))
            });

        } catch (error) {
            console.error('Failed to queue webhook event:', error);
        }
    }

    /**
     * Retry a specific delivery immediately
     */
    async retryDelivery(deliveryId: string) {
        const delivery = await prisma.webhookDelivery.findUnique({
            where: { id: deliveryId },
            include: { subscription: true }
        });

        if (!delivery) {
            throw new Error(`Webhook delivery ${deliveryId} not found`);
        }

        await this.deliver(delivery);
    }

    /**
     * Process pending webhook deliveries
     */
    async processPending(limit: number = 50) {
        const pending = await prisma.webhookDelivery.findMany({
            where: {
                status: 'PENDING',
                nextAttemptAt: { lte: new Date() }
            },
            take: limit,
            include: { subscription: true }
        });

        for (const delivery of pending) {
            await this.deliver(delivery);
        }

        return pending.length;
    }

    /**
     * Attempt delivery of a single webhook
     */
    private async deliver(delivery: any) {
        const { subscription, payload, eventType } = delivery;
        const attempts = delivery.attempts + 1;

        try {
            // 1. Sign Payload
            const payloadString = JSON.stringify(payload);
            const signature = crypto
                .createHmac('sha256', subscription.secret)
                .update(payloadString)
                .digest('hex');

            // 2. Send Request
            await axios.post(subscription.url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-QC-Signature': signature,
                    'X-QC-Event': eventType,
                    'X-QC-Delivery-Id': delivery.id,
                    'User-Agent': 'QuantumCert-Webhook/1.0'
                },
                timeout: 5000
            });

            // 3. Success
            await prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    status: 'DELIVERED',
                    attempts,
                    deliveredAt: new Date(),
                    lastError: null
                }
            });

            await this.auditService.log({
                eventType: 'WEBHOOK_DELIVERY_SUCCESS',
                severity: 'INFO',
                actorType: 'SYSTEM',
                payload: { deliveryId: delivery.id, url: subscription.url }
            });

        } catch (error: any) {
            // 4. Failure & Retry Logic
            const errorMessage = error.message || 'Unknown error';
            const nextAttempt = this.calculateBackoff(attempts);
            const status = attempts >= 5 ? 'FAILED' : 'PENDING';

            await prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    status,
                    attempts,
                    lastError: errorMessage,
                    nextAttemptAt: status === 'PENDING' ? nextAttempt : null
                }
            });

            await this.auditService.log({
                eventType: status === 'FAILED' ? 'WEBHOOK_DELIVERY_FAILED' : 'WEBHOOK_DELIVERY_RETRY_SCHEDULED',
                severity: status === 'FAILED' ? 'ERROR' : 'WARNING',
                actorType: 'SYSTEM',
                payload: { deliveryId: delivery.id, error: errorMessage, attempt: attempts }
            });
        }
    }

    /**
     * Exponential Backoff Strategy
     */
    private calculateBackoff(attempts: number): Date {
        const now = new Date();
        let minutes = 0;

        switch (attempts) {
            case 1: minutes = 1; break;
            case 2: minutes = 5; break;
            case 3: minutes = 30; break;
            case 4: minutes = 120; break; // 2 hours
            default: minutes = 1440; break; // 24 hours
        }

        return new Date(now.getTime() + minutes * 60000);
    }
}
