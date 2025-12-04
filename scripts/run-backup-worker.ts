import { BackupService } from '../src/services/backup/BackupService';
import { DisasterRecoveryService } from '../src/services/backup/DisasterRecoveryService';
import { apiLogger } from '../src/utils/logger';

const backupService = new BackupService();
const drService = new DisasterRecoveryService();

async function run() {
    apiLogger.info('Starting Backup Worker...');

    // Simple loop for demonstration. In prod, use cron or a job queue.
    setInterval(async () => {
        try {
            apiLogger.info('Running scheduled hourly backup...');
            await backupService.createBackup({ type: 'INCREMENTAL', encrypt: true });
        } catch (error) {
            apiLogger.error('Scheduled backup failed', { error });
        }
    }, 60 * 60 * 1000); // 1 hour

    // Daily Integrity Check
    setInterval(async () => {
        try {
            apiLogger.info('Running daily integrity audit...');
            await drService.runIntegrityAudit();
        } catch (error) {
            apiLogger.error('Integrity audit failed', { error });
        }
    }, 24 * 60 * 60 * 1000); // 24 hours
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
