import { Request, Response } from 'express';
import { TenantConfigService } from '../core/TenantConfigService';
import { AgentOrchestrator } from '../agents/AgentOrchestrator';
import { apiLogger } from '../../../utils/logger';

const tenantService = new TenantConfigService();
const orchestrator = new AgentOrchestrator();

export class VeraController {

    /**
     * POST /api/v1/vera/campaign
     * Request a new marketing campaign
     */
    static async createCampaign(req: Request, res: Response) {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            if (!apiKey) return res.status(401).json({ error: 'Missing API Key' });

            const tenant = await tenantService.getTenantByApiKey(apiKey);
            if (!tenant) return res.status(403).json({ error: 'Invalid API Key' });

            const { brief, channel } = req.body;
            if (!brief) return res.status(400).json({ error: 'Brief is required' });

            apiLogger.info(`[API] Campaign Request from ${tenant.name}: "${brief}"`);

            // Delegate to Orchestrator with Tenant Context
            const result = await orchestrator.createCampaignForTenant(tenant, brief, channel);

            return res.json({
                success: true,
                tenant: tenant.name,
                campaign: result
            });

        } catch (error: any) {
            apiLogger.error('Error creating campaign', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/v1/vera/interact
     * Chat with Vera (Support/Queries)
     */
    static async interact(req: Request, res: Response) {
        try {
            const apiKey = req.headers['x-api-key'] as string;
            const tenant = await tenantService.getTenantByApiKey(apiKey);
            if (!tenant) return res.status(403).json({ error: 'Invalid API Key' });

            const { message, context } = req.body;

            // TODO: Implement Chat Logic in Orchestrator
            // const reply = await orchestrator.chat(tenant, message, context);

            return res.json({
                success: true,
                reply: `[Vera @ ${tenant.name}] I received your message: "${message}". (Chat logic pending)`
            });

        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
}
