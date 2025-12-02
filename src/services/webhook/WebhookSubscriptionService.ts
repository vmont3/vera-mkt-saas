import { prisma } from '../../database/prismaClient';
import crypto from 'crypto';

export class WebhookSubscriptionService {

    /**
     * Create a new Webhook Subscription
     */
    async createSubscription(data: {
        partnerId?: string;
        name: string;
        url: string;
        eventTypes: string[];
    }) {
        const secret = 'whsec_' + crypto.randomBytes(32).toString('hex');

        return prisma.webhookSubscription.create({
            data: {
                partnerId: data.partnerId,
                name: data.name,
                url: data.url,
                secret,
                eventTypes: data.eventTypes,
                active: true
            }
        });
    }

    /**
     * Rotate Secret
     */
    async rotateSecret(id: string) {
        const newSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');

        return prisma.webhookSubscription.update({
            where: { id },
            data: { secret: newSecret }
        });
    }

    /**
     * Activate Subscription
     */
    async activateSubscription(id: string) {
        return prisma.webhookSubscription.update({
            where: { id },
            data: { active: true }
        });
    }

    /**
     * Deactivate Subscription
     */
    async deactivateSubscription(id: string) {
        return prisma.webhookSubscription.update({
            where: { id },
            data: { active: false }
        });
    }

    /**
     * List Subscriptions
     */
    async listSubscriptions(partnerId?: string) {
        return prisma.webhookSubscription.findMany({
            where: partnerId ? { partnerId } : undefined
        });
    }
}
