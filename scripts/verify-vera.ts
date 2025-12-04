import { TenantManager } from '../src/core/TenantManager';
import { BillingService } from '../src/services/BillingService';
import { IntelligentPartnerHub } from '../src/partners/IntelligentPartnerHub';
import { MultiPlatformPersonaAgent } from '../src/agents/MultiPlatformPersonaAgent';
import { QuantumLab } from '../src/lab/QuantumLab';

async function runVerification() {
    console.log('🚀 Starting Vera 5.0 Verification...');
    let errors = 0;

    try {
        // 1. TenantManager
        console.log('\n--- Testing TenantManager ---');
        const tm = TenantManager.getInstance();
        const tenant = await tm.createTenant('Test Corp', 'pro');
        if (!tenant.id || tenant.name !== 'Test Corp') throw new Error('Tenant creation failed');
        console.log('✅ Tenant creation passed');

        const admin = await tm.validateApiKey('admin-key');
        if (admin?.settings.role !== 'admin') throw new Error('Admin validation failed');
        console.log('✅ Admin validation passed');

        // 2. BillingService
        console.log('\n--- Testing BillingService ---');
        const bs = BillingService.getInstance();
        await bs.trackUsage(tenant.id, 'api_calls', 1);
        const invoice = await bs.generateInvoice(tenant.id, new Date(), new Date());
        if (!invoice.id) throw new Error('Invoice generation failed');
        console.log('✅ Billing passed');

        // 3. IntelligentPartnerHub
        console.log('\n--- Testing IntelligentPartnerHub ---');
        const hub = IntelligentPartnerHub.getInstance();
        const task = {
            taskId: 't1',
            type: 'text_generation' as const,
            priority: 'high' as const,
            constraints: {}
        };
        const partner = hub.selectBestPartner(task);
        if (!partner) throw new Error('Partner selection failed');
        console.log(`✅ Partner selection passed: ${partner.name}`);

        // Test Execution (Expect Error without API Key)
        console.log('Testing Gemini Execution (Expect API Key Error)...');
        const output = await hub.executeTask(task, 'Hello Gemini');
        console.log(`Output: ${output}`);

        // 4. MultiPlatformPersonaAgent
        console.log('\n--- Testing MultiPlatformPersonaAgent ---');
        const agent = new MultiPlatformPersonaAgent({
            id: 'p1',
            name: 'Vera',
            role: 'support',
            tone: 'friendly',
            knowledgeBaseIds: []
        });
        const response = await agent.handleMessage({
            platform: 'whatsapp',
            userId: 'u1',
            content: 'Hello'
        });
        if (!response.includes('*Vera*')) throw new Error('Agent response format failed');
        console.log('✅ Agent response passed');

        // 5. QuantumLab
        console.log('\n--- Testing QuantumLab ---');
        const lab = QuantumLab.getInstance();
        const exp = lab.createExperiment('Prompt Test', [
            { id: 'A', promptTemplate: 'Hi {{input}}', modelId: 'gemini-1.5-pro' },
            { id: 'B', promptTemplate: 'Hello {{input}}', modelId: 'gemini-1.5-pro' }
        ]);
        const result = await lab.runTrial(exp.id, 'User');
        if (!result.output) throw new Error('Experiment trial failed');
        console.log('✅ Experiment passed');

    } catch (error) {
        console.error('❌ Verification FAILED:', error);
        errors++;
    }

    if (errors === 0) {
        console.log('\n✨ ALL SYSTEMS OPERATIONAL ✨');
        process.exit(0);
    } else {
        console.log('\n⚠️ Verification completed with errors.');
        process.exit(1);
    }
}

runVerification();
