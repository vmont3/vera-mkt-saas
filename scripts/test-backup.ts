import { BackupService } from '../src/services/backup/BackupService';

async function test() {
    console.log('Testing BackupService...');
    const service = new BackupService();

    try {
        console.log('1. Creating Backup...');
        const backup = await service.createBackup({ type: 'INCREMENTAL', encrypt: true });
        console.log('Backup created:', backup);

        console.log('2. Verifying Backup...');
        const isValid = await service.verifyBackup(backup.id);
        console.log('Backup valid:', isValid);

        if (!isValid) throw new Error('Backup verification failed');

        console.log('3. Listing Backups...');
        const list = await service.listBackups();
        console.log('Found backups:', list.length);

        console.log('SUCCESS: Backup flow verified.');
    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

test();
