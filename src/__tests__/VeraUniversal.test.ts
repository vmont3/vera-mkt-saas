import { expect } from 'chai';
import { TenantManager } from '../core/TenantManager';
import { BillingService } from '../services/BillingService';
import { IntelligentPartnerHub } from '../partners/IntelligentPartnerHub';
import { MultiPlatformPersonaAgent } from '../agents/MultiPlatformPersonaAgent';
import { QuantumLab } from '../lab/QuantumLab';

describe('Vera 5.0 Universal API Modules', () => {

    describe('TenantManager', () => {
        it('should create a new tenant', async () => {
            const tm = TenantManager.getInstance();
            const tenant = await tm.createTenant('Test Corp', 'pro');
            expect(tenant).to.have.property('id');
            expect(tenant.name).to.equal('Test Corp');
            expect(tenant.apiKey).to.be.a('string');
        });

        it('should validate admin key', async () => {
            const tm = TenantManager.getInstance();
            const tenant = await tm.validateApiKey('admin-key');
            expect(tenant).to.not.be.null;
            expect(tenant?.settings.role).to.equal('admin');
        });
    });

    describe('BillingService', () => {
        it('should track usage and generate invoice', async () => {
            const bs = BillingService.getInstance();
            await bs.trackUsage('tenant-123', 'api_calls', 1);

            const invoice = await bs.generateInvoice('tenant-123', new Date(), new Date());
            expect(invoice).to.have.property('id');
            expect(invoice.amount).to.be.a('number');
        });
    });

    describe('IntelligentPartnerHub', () => {
        it('should select best partner based on priority', () => {
            const hub = IntelligentPartnerHub.getInstance();
            const task = {
                taskId: 't1',
                type: 'text_generation' as const,
                priority: 'high' as const,
                constraints: {}
            };
            const partner = hub.selectBestPartner(task);
            expect(partner).to.not.be.undefined;
            // High priority should favor quality (e.g., Gemini 1.5 Pro)
            expect(partner.qualityScore).to.be.greaterThan(90);
        });
    });

    describe('MultiPlatformPersonaAgent', () => {
        it('should handle messages and format response', async () => {
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

            expect(response).to.contain('*Vera*'); // WhatsApp formatting
        });
    });

    describe('QuantumLab', () => {
        it('should create experiment and run trial', async () => {
            const lab = QuantumLab.getInstance();
            const exp = lab.createExperiment('Prompt Test', [
                { id: 'A', promptTemplate: 'Hi {{input}}', modelId: 'gemini-1.5-pro' },
                { id: 'B', promptTemplate: 'Hello {{input}}', modelId: 'gemini-1.5-pro' }
            ]);

            const result = await lab.runTrial(exp.id, 'User');
            expect(result).to.have.property('variantId');
            expect(result).to.have.property('output');
        });
    });

});
