import { OfflineEventProcessorService } from '../src/services/offline/OfflineEventProcessorService';
import { prisma } from '../src/database/prismaClient';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const processor = new OfflineEventProcessorService();
const INTERVAL_MS = 60000; // 60 seconds

async function runWorker() {
    console.log('🚀 Offline Sync Worker started...');

    while (true) {
        try {
            const processed = await processor.processPendingEvents();
            if (processed > 0) {
                console.log(`✅ Processed ${processed} events.`);
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
