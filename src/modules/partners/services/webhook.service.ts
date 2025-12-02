import axios from 'axios';
import { prisma } from '../../../database/prismaClient';

export class WebhookService {
    async dispatchEvent(partnerId: string, eventType: string, payload: any) {
        const webhooks = await prisma.partnerWebhook.findMany({
            where: {
                partnerId,
                isActive: true,
            },
        });

        for (const webhook of webhooks) {
            const allowedEvents = webhook.eventTypes as string[];
            if (allowedEvents.includes(eventType) || allowedEvents.includes('*')) {
                this.sendWebhook(webhook.url, webhook.secret, eventType, payload);
            }
        }
    }

    private async sendWebhook(url: string, secret: string | null, eventType: string, payload: any) {
        try {
            // In a real app, we would sign the payload with the secret using HMAC
            // const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

            await axios.post(url, {
                eventType,
                timestamp: new Date().toISOString(),
                payload,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': secret || '',
                },
                timeout: 5000,
            });
        } catch (error) {
            console.error(`Failed to send webhook to ${url}:`, error);
            // TODO: Implement retry logic (queue-based)
        }
    }
}
