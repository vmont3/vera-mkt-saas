import { prisma } from '../../../database/prismaClient';
import { WebhookService } from './webhook.service';

const webhookService = new WebhookService();

export class EventService {
    async emit(partnerId: string, eventType: string, payload: any, assetId?: string) {
        // 1. Persist event
        const event = await prisma.partnerEvent.create({
            data: {
                partnerId,
                eventType,
                payload,
                assetId,
                processed: false, // Could be used for async processing workers
            },
        });

        // 2. Dispatch webhooks (fire and forget for now, or queue)
        webhookService.dispatchEvent(partnerId, eventType, payload).catch(err => {
            console.error('Error dispatching webhook:', err);
        });

        return event;
    }

    async listEvents(partnerId: string) {
        return prisma.partnerEvent.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
