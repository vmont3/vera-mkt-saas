import { WebhookDispatcherService } from '../src/services/webhook/WebhookDispatcherService';
import { WebhookSubscriptionService } from '../src/services/webhook/WebhookSubscriptionService';
import { PrismaClient } from '@prisma/client';

// Load environment variables from root .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const dispatcher = new WebhookDispatcherService();
const subService = new WebhookSubscriptionService();

async function testWebhook() {
    console.log('🧪 Testing Webhook Dispatcher...');

    // 1. Create Test Subscription
    const sub = await subService.createSubscription({
        name: 'Test Listener',
        url: 'https://webhook.site/uuid', // Replace with a real test URL if needed
        eventTypes: ['test.event']
    });
    console.log('✅ Created Subscription:', sub.id);

    // 2. Queue Event
    await dispatcher.queueEvent('test.event', {
        message: 'Hello World',
        timestamp: new Date()
    });
    console.log('✅ Queued Event');

    // 3. Process Pending
    console.log('🔄 Processing Pending...');
    const count = await dispatcher.processPending(10);
    console.log(`✅ Processed ${count} deliveries`);

    // 4. Check Delivery Status
    const deliveries = await prisma.webhookDelivery.findMany({
        where: { subscriptionId: sub.id },
        orderBy: { createdAt: 'desc' }
    });

    console.log('📦 Deliveries:', deliveries);
}

// Run if called directly
if (require.main === module) {
    testWebhook();
}
