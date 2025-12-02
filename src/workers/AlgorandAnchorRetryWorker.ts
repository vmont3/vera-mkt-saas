import { PrismaClient } from '@prisma/client';
import { AlgorandAnchorService } from '../services/blockchain/AlgorandAnchorService';
import { AuditLogger } from '../services/AuditLogger';

const prisma = new PrismaClient();
const anchorService = new AlgorandAnchorService();

export class AlgorandAnchorRetryWorker {
    /**
     * Process pending anchors with exponential backoff
     */
    async processPendingAnchors() {
        console.log('🔄 [RetryWorker] Checking for pending anchors...');

        try {
            const pendingItems = await prisma.pendingAnchor.findMany({
                orderBy: { createdAt: 'asc' },
                take: 50 // Process in batches
            });

            if (pendingItems.length === 0) {
                console.log('✅ [RetryWorker] No pending anchors found.');
                return;
            }

            console.log(`found ${pendingItems.length} pending anchors.`);

            for (const item of pendingItems) {
                if (this.shouldRetry(item)) {
                    await this.retryAnchor(item);
                }
            }

        } catch (error) {
            console.error('❌ [RetryWorker] Error processing batch:', error);
        }
    }

    /**
     * Determine if an item should be retried based on backoff strategy
     */
    private shouldRetry(item: any): boolean {
        const now = new Date().getTime();
        const lastUpdate = new Date(item.updatedAt).getTime();
        const diffMinutes = (now - lastUpdate) / 1000 / 60;

        // Backoff Strategy
        // Attempt 0 (Initial failure): Retry immediately (or after 1 min)
        // Attempt 1: Retry after 1 min
        // Attempt 2: Retry after 5 min
        // Attempt 3: Retry after 30 min
        // Attempt 4: Retry after 1 hour
        // Attempt 5: Retry after 6 hours
        // Attempt > 5: Retry every 24 hours

        switch (item.attempts) {
            case 0: return true;
            case 1: return diffMinutes >= 1;
            case 2: return diffMinutes >= 5;
            case 3: return diffMinutes >= 30;
            case 4: return diffMinutes >= 60;
            case 5: return diffMinutes >= 360;
            default: return diffMinutes >= 1440;
        }
    }

    /**
     * Execute the retry logic
     */
    private async retryAnchor(item: any) {
        console.log(`🔄 [RetryWorker] Retrying anchor for asset ${item.assetId} (Attempt ${item.attempts + 1})...`);

        try {
            const { txId } = await anchorService.anchorAsset(item.assetId, item.falconHash);

            console.log(`✅ [RetryWorker] Success! TxID: ${txId}`);

            // Success: Delete pending record
            await prisma.pendingAnchor.delete({
                where: { id: item.id }
            });

            // Audit Log: Success
            const { AuditLogService } = await import('../services/audit/AuditLogService');
            const auditService = new AuditLogService();
            await auditService.log({
                eventType: 'ANCHORING_RETRY_SUCCESS',
                severity: 'INFO',
                actorType: 'WORKER',
                actorId: 'AlgorandAnchorRetryWorker',
                assetId: item.assetId,
                payload: {
                    txId,
                    attempts: item.attempts + 1
                }
            });

        } catch (error: any) {
            console.warn(`⚠️  [RetryWorker] Failed again: ${error.message}`);

            // Failure: Update attempts and last error
            await prisma.pendingAnchor.update({
                where: { id: item.id },
                data: {
                    attempts: { increment: 1 },
                    lastError: error.message
                }
            });

            // Audit Log: Failure
            const { AuditLogService } = await import('../services/audit/AuditLogService');
            const auditService = new AuditLogService();
            await auditService.log({
                eventType: 'ANCHORING_RETRY_FAILED',
                severity: 'WARNING',
                actorType: 'WORKER',
                actorId: 'AlgorandAnchorRetryWorker',
                assetId: item.assetId,
                payload: {
                    error: error.message,
                    attempts: item.attempts + 1,
                    falconHash: item.falconHash
                }
            });
        }
    }
}
