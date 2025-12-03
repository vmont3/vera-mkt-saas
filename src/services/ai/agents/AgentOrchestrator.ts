import { CopywriterAgent } from './CopywriterAgent';
import { CriticAgent } from './CriticAgent';
import { SeoSpecialistAgent } from './SeoSpecialistAgent';
import { ImageGenerationService } from '../ImageGenerationService';
import { MetaLearnerAgent } from '../core/MetaLearnerAgent';
import { QuantumPredictorAgent } from './QuantumPredictorAgent';
import { NarrativeWeaverAgent } from './NarrativeWeaverAgent';
import { TenantConfig } from '../core/TenantConfigService';
import { MemoryStream } from '../core/MemoryStream';
import { QuantumTokenAgent } from './QuantumTokenAgent';

export class AgentOrchestrator {
    private copywriters: Record<string, CopywriterAgent>;
    private critic: CriticAgent;
    private seo: SeoSpecialistAgent;
    private designer: ImageGenerationService;
    private memory: MemoryStream;
    private metaLearner: MetaLearnerAgent;
    private predictor: QuantumPredictorAgent;
    private narrator: NarrativeWeaverAgent;
    private tokenAgent: QuantumTokenAgent;

    constructor() {
        this.copywriters = {
            'TECH': new CopywriterAgent('TECH'),
            'SUSTAINABILITY': new CopywriterAgent('SUSTAINABILITY'),
            'LIFESTYLE': new CopywriterAgent('LIFESTYLE')
        };
        this.critic = new CriticAgent();
        this.seo = new SeoSpecialistAgent();
        this.designer = new ImageGenerationService();
        this.memory = new MemoryStream();
        this.metaLearner = new MetaLearnerAgent(this.memory);
        this.predictor = new QuantumPredictorAgent();
        this.narrator = new NarrativeWeaverAgent();
        this.tokenAgent = new QuantumTokenAgent();
    }

    // ... (existing methods)

    /**
     * Daily Mission Loop
     */
    async runDailyMission() {
        console.log('[VERA-CMO] 🌅 Starting Daily Mission...');

        // 1. Get Narrative Brief (Storytelling)
        const narrativeTopic = await this.narrator.getDailyNarrativeBrief();

        // 2. Create Daily Content based on Narrative
        const campaign = await this.createCampaign(narrativeTopic, 'TECH');

        // 3. Reward the "Team" (Simulated User)
        // In a real scenario, this would reward the user who approved or the agent itself
        await this.tokenAgent.rewardUser('MOCK_USER_WALLET', 50, 'Daily Mission Complete');

        // 4. Run Evolution Cycle (Meta-Learning)
        await this.metaLearner.runEvolutionCycle();

        // 5. Run Prediction Cycle (Time Awareness)
        await this.predictor.runPredictionCycle();
    }
    /**
     * Multi-Tenant Campaign Creation
     * Uses Tenant Config to drive tone and strategy
     */
    async createCampaignForTenant(tenant: TenantConfig, brief: string, channel: string) {
        console.log(`[ORCHESTRATOR] 🌍 Starting Multi-Tenant Campaign for: ${tenant.name}`);

        // 0. SEO Research (Contextualized)
        const seoInsights = await this.seo.execute({ topic: brief });

        // 1. Select Writer based on Tenant Tone
        const category = tenant.brandVoice.tone.includes('Eco') ? 'SUSTAINABILITY' : 'TECH';
        const writer = this.copywriters[category];

        // 2. Draft Content with Tenant Voice
        const context = `
            Brand: ${tenant.name}
            Tone: ${tenant.brandVoice.tone}
            Keywords: ${tenant.brandVoice.keywords.join(', ')}
            Banned: ${tenant.brandVoice.bannedKeywords.join(', ')}
            Goal: ${tenant.goals.primary}
            SEO: ${seoInsights.keywords.join(', ')}
        `;

        let draft = await writer.execute({
            topic: brief,
            context
        });

        // 3. Critic Loop
        const review = await this.critic.execute({ draft });
        if (!review.approved && review.improvedDraft) {
            draft = review.improvedDraft;
        }

        // 4. Design Asset
        // Map tenant to brand enum
        let brandEnum: 'QUANTUM' | 'VERUN' | 'PARTNER' = 'PARTNER';
        if (tenant.name.toUpperCase().includes('QUANTUM')) brandEnum = 'QUANTUM';
        if (tenant.name.toUpperCase().includes('VERUN')) brandEnum = 'VERUN';

        const image = await this.designer.generateImage(brief, 'REALISTIC', brandEnum);

        // 5. Log to Tenant Memory
        await this.memory.logInteraction({
            id: `camp_${tenant.id}_${Date.now()}`,
            type: 'mission_success',
            text: draft,
            persona: category,
            channel: channel || 'OMNI',
            metadata: { tenantId: tenant.id, brief },
            company: tenant.name
        });

        return {
            tenant: tenant.name,
            text: draft,
            media: [image],
            seo: seoInsights,
            status: 'READY_FOR_APPROVAL'
        };
    }

    async createCampaign(topic: string, category: 'TECH' | 'SUSTAINABILITY' | 'LIFESTYLE') {
        console.log(`[VERA-CMO] Starting campaign for: ${topic}`);

        // 0. SEO Research
        const seoInsights = await this.seo.execute({ topic });
        console.log(`[VERA-CMO] SEO Strategy: Focusing on keywords ${seoInsights.keywords.join(', ')}`);

        // 1. Select Writer
        const writer = this.copywriters[category];

        // 2. Draft Content (Enriched with SEO)
        let draft = await writer.execute({
            topic,
            context: `Target Keywords: ${seoInsights.keywords.join(', ')}. Competitor Insight: ${seoInsights.competitorInsights}`
        });
        console.log(`[VERA-CMO] Draft received. Sending to Critic...`);

        // 3. Critic Loop
        const review = await this.critic.execute({ draft });
        if (!review.approved && review.improvedDraft) {
            console.log(`[VERA-CMO] Critic requested changes. Applying humanization.`);
            draft = review.improvedDraft;
        }

        // 4. Design Asset
        const brand = category === 'SUSTAINABILITY' ? 'VERUN' : 'QUANTUM';
        const image = await this.designer.generateImage(topic, 'REALISTIC', brand);

        // 5. Log to Memory
        await this.memory.logInteraction({
            id: `campaign_${Date.now()}`,
            type: 'mission_success',
            text: draft,
            persona: category,
            channel: 'OMNI',
            metadata: { topic, seo: seoInsights }
        });

        return {
            text: draft,
            media: [image],
            seoReport: seoInsights,
            status: 'READY_FOR_APPROVAL'
        };
    }
}
