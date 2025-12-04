import { TagEncodingWorkerService } from '../src/services/worker/TagEncodingWorkerService';
import { prisma } from '../src/database/prismaClient';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const worker = new TagEncodingWorkerService();
const INTERVAL_MS = 10000; // 10 seconds

async function runWorker() {
    console.log('🚀 Tag Encoding Worker started...');
    console.log('   Press Ctrl+C to stop.');

    while (true) {
        try {
            const processed = await worker.processAllPending();
            if (processed > 0) {
                console.log(`✅ Processed ${processed} jobs.`);
            }
        } catch (error) {
            console.error('❌ Error in worker loop:', error);
        }

        // Wait for next interval
        await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }
}

runWorker()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
