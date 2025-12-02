import { WebhookDispatcherService } from '../src/services/webhook/WebhookDispatcherService';

const dispatcher = new WebhookDispatcherService();

async function runWorker() {
    console.log('🚀 Webhook Worker Started');

    while (true) {
        try {
            const count = await dispatcher.processPending(50);
            if (count > 0) {
                console.log(`✅ Processed ${count} webhook deliveries`);
            }
        } catch (error) {
            console.error('❌ Error in Webhook Worker:', error);
        }

        // Wait 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

// Run if called directly
if (require.main === module) {
    runWorker();
}
