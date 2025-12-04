import { Request, Response } from 'express';
import { prisma } from '../database/prismaClient';
import { AuditLogService } from '../services/audit/AuditLogService';

export class OfflineSyncController {
    private auditService: AuditLogService;

    constructor() {
        this.auditService = new AuditLogService();
    }

    public syncOfflineEvents = async (req: Request, res: Response) => {
        try {
            const { sourceId, events } = req.body;

            if (!events || !Array.isArray(events)) {
                return res.status(400).json({ error: 'Invalid payload: events array is required' });
            }

            const results = [];

            for (let i = 0; i < events.length; i++) {
                const event = events[i];
                const { type, payload, clientTimestamp } = event;

                if (!type || !payload) {
                    results.push({ index: i, accepted: false, error: 'Missing type or payload' });
                    continue;
                }

                try {
                    // Create OfflineEvent record
                    const offlineEvent = await prisma.offlineEvent.create({
                        data: {
                            sourceId: sourceId || null,
                            type,
                            payload,
                            status: 'PENDING',
                            // We could store clientTimestamp in payload or a separate field if needed
                        }
                    });

                    // Audit Log: Event Received
                    await this.auditService.log({
                        eventType: 'OFFLINE_EVENT_RECEIVED',
                        severity: 'INFO',
                        actorType: 'API',
                        actorId: sourceId || 'anonymous',
                        payload: {
                            offlineEventId: offlineEvent.id,
                            type: offlineEvent.type,
                            sourceId
                        }
                    });

                    results.push({
                        index: i,
                        eventId: offlineEvent.id,
                        accepted: true
                    });
                } catch (innerError: any) {
                    console.error('Error saving offline event:', innerError);
                    results.push({
                        index: i,
                        accepted: false,
                        error: innerError.message
                    });
                }
            }

            return res.status(200).json({
                message: 'Sync processed',
                results
            });

        } catch (error: any) {
            console.error('Offline sync error:', error);
            return res.status(500).json({ error: 'Internal server error processing sync' });
        }
    }
}
