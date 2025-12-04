import { TagEncodingWorkerService } from '../src/services/worker/TagEncodingWorkerService';
import { prisma } from '../src/database/prismaClient';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log('🧪 Testing Tag Encoding Worker...');

    // 1. Create a Mock Job
    // We need a valid config ID. Let's find one or create a dummy one.
    let config = await prisma.nTAG424Config.findFirst();
    if (!config) {
        console.log('⚠️ No config found. Creating dummy config...');
        config = await prisma.nTAG424Config.create({
            data: {
                keyAppSecretArn: 'mock-arn',
                keySdmSecretArn: 'mock-arn',
                sdmUrlTemplate: 'https://test.com',
                sdmEncOffset: 0,
                sdmEncLength: 64,
                sdmReadCtrOffset: 0,
                sdmMacOffset: 0,
                sdmMacInputOffset: 0
            }
        });
    }

    const mockJob = await prisma.encoderQueue.create({
        data: {
            configId: config.id,
            partnerAssetId: null, // Avoid FK constraint failure
            masterHashVaultKey: 'mock_falcon_hash',
            hashTruncated: 'mock_truncated_hash',
            sdmPayload: {} as any,
            status: 'PENDING',
            priority: 10
        }
    });

    console.log(`📝 Mock Job created: ${mockJob.id}`);

    // 2. Run Worker (Single Pass)
    const worker = new TagEncodingWorkerService();
    console.log('🏃 Running worker processNextJob()...');

    // Note: This will fail if no physical reader is connected, which is expected in this environment.
    // We just want to verify it picks up the job and attempts to initialize.
    try {
        const result = await worker.processNextJob();
        console.log(`Worker result: ${result}`);
    } catch (error) {
        console.log('Worker threw error (expected if no hardware):', error);
    }

    // 3. Verify Job Status
    const updatedJob = await prisma.encoderQueue.findUnique({ where: { id: mockJob.id } });
    console.log(`Job Status: ${updatedJob?.status}`);
    console.log(`Attempts: ${updatedJob?.attempts}`);
    console.log(`Error: ${updatedJob?.errorMessage}`);

    // Cleanup
    await prisma.encoderQueue.delete({ where: { id: mockJob.id } });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
