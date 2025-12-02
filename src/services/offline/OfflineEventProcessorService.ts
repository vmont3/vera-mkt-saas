import { prisma } from '../../database/prismaClient';
import { AuditLogService } from '../audit/AuditLogService';
import { VerificationService } from '../verification/VerificationService';
import { IncidentService } from '../incidents/IncidentService';

export class OfflineEventProcessorService {
    private auditService: AuditLogService;
    private verificationService: VerificationService;
    private incidentService: IncidentService;

    constructor() {
        this.auditService = new AuditLogService();
        this.verificationService = new VerificationService();
        this.incidentService = new IncidentService();
    }

    public async processPendingEvents(limit: number = 50) {
        // Fetch pending events
        const events = await prisma.offlineEvent.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            take: limit
        });

        if (events.length === 0) {
            return 0;
        }

        console.log(`🔄 Processing ${events.length} offline events...`);
        let processedCount = 0;

        for (const event of events) {
            try {
                const payload = event.payload as any;

                switch (event.type) {
                    case 'SDM_SCAN':
                        await this.verificationService.processOfflineScan(payload);
                        break;
                    case 'INCIDENT_CREATE':
                        await this.incidentService.processOfflineIncident(payload);
                        break;
                    case 'INCIDENT_DELEGATE':
                        await this.incidentService.createAuthorityIncident(payload);
                        break;
                    default:
                        throw new Error(`Unknown event type: ${event.type}`);
                }

                // Mark as PROCESSED
                await prisma.offlineEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'PROCESSED',
                        processedAt: new Date(),
                        error: null
                    }
                });

                // Audit Log
                await this.auditService.log({
                    eventType: 'OFFLINE_EVENT_PROCESSED',
                    severity: 'INFO',
                    actorType: 'SYSTEM',
                    actorId: 'OfflineEventProcessor',
                    payload: {
                        offlineEventId: event.id,
                        type: event.type,
                        status: 'SUCCESS'
                    }
                });

                processedCount++;

            } catch (error: any) {
                console.error(`❌ Failed to process event ${event.id}:`, error.message);

                // Mark as FAILED
                await prisma.offlineEvent.update({
                    where: { id: event.id },
                    data: {
                        status: 'FAILED',
                        error: error.message
                    }
                });

                // Audit Log Failure
                await this.auditService.log({
                    eventType: 'OFFLINE_EVENT_FAILED',
                    severity: 'ERROR',
                    actorType: 'SYSTEM',
                    actorId: 'OfflineEventProcessor',
                    payload: {
                        offlineEventId: event.id,
                        type: event.type,
                        error: error.message
                    }
                });
            }
        }

        return processedCount;
    }
}
