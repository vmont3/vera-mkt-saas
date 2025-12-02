import cron from 'node-cron';
import { AgentOrchestrator } from '../ai/agents/AgentOrchestrator';
import { SocialMediaService } from '../social/SocialMediaService';

export class CronService {
    private cmo: AgentOrchestrator;
    private social: SocialMediaService;

    constructor() {
        this.cmo = new AgentOrchestrator();
        this.social = new SocialMediaService();
        this.initializeJobs();
    }

    private initializeJobs() {
        console.log('[SCHEDULER] Initializing Autonomous Routine...');

        // 1. Daily Planning (09:00 AM)
        // "Wake up, check trends, propose content."
        cron.schedule('0 9 * * *', async () => {
            console.log('[SCHEDULER] ⏰ 09:00 AM - Starting Daily Planning...');
            try {
                // In a real scenario, we would check the calendar/trends first.
                // For now, we trigger a proactive campaign generation.
                const topic = 'Daily Tech Update'; // Dynamic topic in future
                const draft = await this.cmo.createCampaign(topic, 'TECH');

                // Send to Admin for Approval via Telegram
                // We need to access VeraChatService instance or use a shared event bus.
                // For MVP, we'll log it. Ideally, SocialMediaService should handle the "Draft Created" event.
                console.log('[SCHEDULER] Proactive Draft Created:', draft.text);

                // TODO: Trigger VeraChatService.sendDraftForApproval()
                // This requires dependency injection or a singleton pattern for VeraChatService.
            } catch (error) {
                console.error('[SCHEDULER] Daily Planning Failed:', error);
            }
        });

        // 2. Performance Review (08:00 PM)
        // "Analyze today's performance, learn, and sleep."
        cron.schedule('0 20 * * *', async () => {
            console.log('[SCHEDULER] 🌙 08:00 PM - Starting Performance Review...');
            try {
                // Trigger Analyst (Future Phase)
                console.log('[SCHEDULER] Analyzing metrics... (Mock)');
                // await this.analyst.reviewPerformance();
            } catch (error) {
                console.error('[SCHEDULER] Performance Review Failed:', error);
            }
        });

        console.log('[SCHEDULER] Jobs Scheduled: Daily Planning (09:00), Performance Review (20:00).');
    }
}
