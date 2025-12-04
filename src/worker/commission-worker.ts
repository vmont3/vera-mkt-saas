import { prisma } from '../database/prismaClient';

export class CommissionWorker {

    /**
     * Daily Job: Release matured commissions (D+30)
     */
    static async runDailySettlement() {
        console.log('[CommissionWorker] Starting daily settlement job...');

        try {
            const now = new Date();

            // Find PENDING commissions that are ready to be released
            const commissionsToRelease = await prisma.commission.findMany({
                where: {
                    status: 'PENDING',
                    availableAt: {
                        lte: now
                    }
                }
            });

            console.log(`[CommissionWorker] Found ${commissionsToRelease.length} commissions to release.`);

            let processed = 0;
            let errors = 0;

            for (const commission of commissionsToRelease) {
                try {
                    await prisma.$transaction(async (tx) => {
                        // 1. Update Status
                        await tx.commission.update({
                            where: { id: commission.id },
                            data: { status: 'AVAILABLE' }
                        });

                        // 2. Credit Wallet
                        if (commission.userId) {
                            await tx.wallet.upsert({
                                where: { userId: commission.userId },
                                create: { userId: commission.userId, moneyAvailable: commission.amount },
                                update: { moneyAvailable: { increment: commission.amount } }
                            });
                        }
                        // TODO: Handle Partner Wallet
                    });
                    processed++;
                } catch (err) {
                    console.error(`[CommissionWorker] Failed to release commission ${commission.id}:`, err);
                    errors++;
                }
            }

            console.log(`[CommissionWorker] Job completed. Processed: ${processed}, Errors: ${errors}`);

        } catch (error) {
            console.error('[CommissionWorker] Fatal error in settlement job:', error);
        }
    }
}

// If run directly
if (require.main === module) {
    CommissionWorker.runDailySettlement()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
