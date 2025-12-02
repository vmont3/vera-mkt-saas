/**
 * Example: How to initialize TagEncodingService with TagRegistry integration
 * 
 * This file demonstrates the complete initialization of the encoding workflow
 * according to the "Fluxo Completo da Gravação Única" specification.
 */

import { TagEncodingService } from './core/TagEncodingService';
import { Ntag424Encoder } from './encoder/Ntag424Encoder';
import { PrismaEncodingQueue } from './infra/PrismaEncodingQueue';
import { AwsKmsClient, createAwsKmsClient } from './infra/AwsKmsClient';
import { TagRegistry } from '../tag-registry/TagRegistry';
import { Acr122uNfcHardwareDriver } from './driver/Acr122uNfcHardwareDriver';

/**
 * Initialize the complete encoding workflow
 */
export async function initializeEncodingWorkflow(stationId: string) {
    console.log('🚀 Initializing Quantum Cert Encoding Workflow...\n');

    // 1. Initialize KMS Client (for cryptographic keys)
    const kmsClient = createAwsKmsClient(
        process.env.KMS_MASTER_KEY_ID || 'mock-key-id',
        process.env.AWS_REGION || 'us-east-1'
    );
    console.log('✓ KMS Client initialized');

    // 2. Initialize NFC Hardware Driver
    const nfcDriver = new Acr122uNfcHardwareDriver();
    console.log('✓ NFC Driver initialized (ACR122U)');

    // 3. Initialize NTAG 424 DNA Encoder
    const encoder = new Ntag424Encoder(
        nfcDriver,
        kmsClient,
        {
            ccSize: 32,
            ndefSize: 256,
            protectedSize: 128
        }
    );
    console.log('✓ NTAG424 Encoder initialized');

    // 4. Initialize Encoding Queue (Prisma-based)
    const queue = new PrismaEncodingQueue();
    console.log('✓ Encoding Queue initialized');

    // 5. Initialize Tag Registry (CRITICAL for workflow completion)
    const tagRegistry = new TagRegistry();
    console.log('✓ Tag Registry initialized');

    // 6. Create TagEncodingService with ALL dependencies
    const encodingService = new TagEncodingService(
        queue,
        encoder,
        stationId,
        tagRegistry  // ← Required for UID saving and tag creation
    );
    console.log('✓ TagEncodingService initialized\n');

    console.log('═══════════════════════════════════════════════');
    console.log('  Complete Encoding Workflow Ready!');
    console.log('═══════════════════════════════════════════════\n');

    return {
        encodingService,
        queue,
        encoder,
        kmsClient,
        tagRegistry
    };
}

/**
 * Start the encoding worker loop
 */
export async function startEncodingWorker(stationId: string = 'default-station') {
    const workflow = await initializeEncodingWorkflow(stationId);

    console.log('Starting encoding worker loop...');
    console.log(`Station ID: ${stationId}`);
    console.log('Press Ctrl+C to stop\n');

    // Start the continuous processing loop
    await workflow.encodingService.startLoop(1000);
}

/**
 * Process a single job (for testing)
 */
export async function processOneJob(stationId: string = 'default-station') {
    const workflow = await initializeEncodingWorkflow(stationId);

    console.log('Processing one job...\n');
    const processed = await workflow.encodingService.processNextJob();

    if (processed) {
        console.log('✅ Job processed successfully');
    } else {
        console.log('ℹ️  No pending jobs in queue');
    }
}

// CLI usage
if (require.main === module) {
    const command = process.argv[2];
    const stationId = process.argv[3] || 'default-station';

    switch (command) {
        case 'start':
            startEncodingWorker(stationId);
            break;
        case 'process-one':
            processOneJob(stationId);
            break;
        default:
            console.log('Usage:');
            console.log('  npm run encode-worker start [stationId]     - Start continuous worker');
            console.log('  npm run encode-worker process-one [stationId] - Process one job');
    }
}
