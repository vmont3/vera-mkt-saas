import { RetryWorkerService } from '../src/services/worker/RetryWorkerService';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('🔄 Starting Retry Worker Service...');

    const worker = new RetryWorkerService();

    // Start the loop (runs every 60s by default)
    worker.start(60000);

    console.log('✅ Retry Worker is running in background.');

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('🛑 Stopping Retry Worker...');
        process.exit(0);
    });
}

main().catch(console.error);
