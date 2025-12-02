import { OfflineEventProcessorService } from '../src/services/offline/OfflineEventProcessorService';
import { prisma } from '../src/database/prismaClient';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const processor = new OfflineEventProcessorService();

async function main() {
    console.log('🧪 Testing Offline Sync Module...');

    // 1. Clean up old test events
    await prisma.offlineEvent.deleteMany({
        where: { sourceId: 'TEST_SOURCE' }
    });

    // 2. Insert Mock Events
    console.log('📝 Inserting mock events...');

    // Mock SDM Scan (will likely fail verification due to fake data, but should be processed)
    await prisma.offlineEvent.create({
        data: {
            sourceId: 'TEST_SOURCE',
            type: 'SDM_SCAN',
            payload: {
                d: '00000000000000000000000000000000', // Fake encrypted data
                m: '0000000000000000', // Fake MAC
                r: '000000', // Fake CTR
                uid: '04000000000000' // Fake UID
            }
        }
    });

    // Mock Incident Create
    await prisma.offlineEvent.create({
        data: {
            sourceId: 'TEST_SOURCE',
            type: 'INCIDENT_CREATE',
            payload: {
                type: 'PERDA',
                description: 'Lost in transit (Offline Report)',
                incidentDate: new Date().toISOString(),
                reportedBy: 'TEST_USER'
            }
        }
    });

    console.log('⏳ Pending events created. Running processor...');

    // 3. Run Processor
    const processed = await processor.processPendingEvents();
    console.log(`✅ Processed ${processed} events.`);

    // 4. Verify Results
    const events = await prisma.offlineEvent.findMany({
        where: { sourceId: 'TEST_SOURCE' }
    });

    events.forEach(e => {
        console.log(`Event ${e.id} [${e.type}]: ${e.status} ${e.error ? `(${e.error})` : ''}`);
    });

    // We expect SDM_SCAN to fail (invalid crypto) and INCIDENT_CREATE to fail (user not found) or succeed if validation is loose.
    // The important thing is that they are PROCESSED or FAILED, not PENDING.
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
