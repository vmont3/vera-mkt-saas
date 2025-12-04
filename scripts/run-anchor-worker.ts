import { AlgorandAnchorRetryWorker } from '../src/workers/AlgorandAnchorRetryWorker';
import * as dotenv from 'dotenv';

dotenv.config();

const worker = new AlgorandAnchorRetryWorker();
const INTERVAL_MS = 30000; // Run every 30 seconds

console.log('🛡️  Starting Algorand Anchor Resilience Worker...');
console.log(`⏱️  Polling interval: ${INTERVAL_MS}ms`);

// Initial run
worker.processPendingAnchors();

// Schedule periodic runs
setInterval(() => {
    worker.processPendingAnchors();
}, INTERVAL_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Stopping worker...');
    process.exit(0);
});
