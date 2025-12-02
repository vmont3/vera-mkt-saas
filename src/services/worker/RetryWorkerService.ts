import { PrismaClient } from '@prisma/client';
import { AlgorandAnchorService } from '../blockchain/AlgorandAnchorService';
import { WebhookDispatcherService } from '../webhook/WebhookDispatcherService';
import { AuditLogService } from '../audit/AuditLogService';

const prisma = new PrismaClient();

export class RetryWorkerService {
    private anchorService: AlgorandAnchorService;
    private webhookService: WebhookDispatcherService; // Assuming this exists or we use dispatcher
    private auditService: AuditLogService;
    private isRunning: boolean = false;

    constructor() {
        this.anchorService = new AlgorandAnchorService();
        this.webhookService = new WebhookDispatcherService();
        this.auditService = new AuditLogService();
    }

    /**
     * Start the retry loop
     */
    public start(intervalMs: number = 60000) {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🔄 RetryWorkerService started.');

        setInterval(async () => {
            await this.processPendingAnchors();
            await this.processFailedWebhooks();
        }, intervalMs);
    }

    /**
     * Process PendingAnchor records
     */
    public async processPendingAnchors() {
        const pendingAnchors = await prisma.pendingAnchor.findMany({
            where: {
                attempts: { lt: 10 } // Max 10 retries
            },
            take: 5
        });

        for (const anchor of pendingAnchors) {
            try {
                console.log(`🔄 Retrying anchor for asset ${anchor.assetId}...`);

                // Try to anchor again
                await this.anchorService.anchorAsset(anchor.assetId, anchor.falconHash);

                // If successful, delete the pending record
                await prisma.pendingAnchor.delete({
                    where: { id: anchor.id }
                });

                console.log(`✅ Retry successful for asset ${anchor.assetId}`);

            } catch (error: any) {
                console.error(`❌ Retry failed for asset ${anchor.assetId}:`, error.message);

                await prisma.pendingAnchor.update({
                    where: { id: anchor.id },
                    data: {
                        attempts: { increment: 1 },
                        lastError: error.message,
                        updatedAt: new Date()
                    }
                });
            }
        }
    }

    /**
     * Process failed WebhookDelivery records
     */
    public async processFailedWebhooks() {
        // Find failed deliveries scheduled for retry
        const pendingDeliveries = await prisma.webhookDelivery.findMany({
            where: {
                status: 'PENDING', // or FAILED if we use that for retryable
                nextAttemptAt: { lte: new Date() },
                attempts: { lt: 5 }
            },
            take: 10,
            include: { subscription: true }
        });

        for (const delivery of pendingDeliveries) {
            try {
                // We need a method in WebhookDispatcher to retry a specific delivery
                // Or we just call the dispatch logic again.
                // Let's assume WebhookDispatcher has a retry method or we use axios directly here.
                // Better to delegate to WebhookDispatcherService.

                await this.webhookService.retryDelivery(delivery.id);

            } catch (error: any) {
                console.error(`❌ Webhook retry failed for ${delivery.id}:`, error.message);
                // The service should handle the update, but if it throws, we might need to handle here.
            }
        }
    }
}
