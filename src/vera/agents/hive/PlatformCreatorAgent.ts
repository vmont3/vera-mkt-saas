import { IntelligentPartnerHub, TaskRequest } from '../../../partners/IntelligentPartnerHub';
import { PrismaClient } from '@prisma/client';

export class PlatformCreatorAgent {
    private static instance: PlatformCreatorAgent;
    private hub: IntelligentPartnerHub;
    private prisma: PrismaClient;

    private constructor() {
        this.hub = IntelligentPartnerHub.getInstance();
        this.prisma = new PrismaClient();
    }

    public static getInstance(): PlatformCreatorAgent {
        if (!PlatformCreatorAgent.instance) {
            PlatformCreatorAgent.instance = new PlatformCreatorAgent();
        }
        return PlatformCreatorAgent.instance;
    }

    /**
     * Executes the creation of content (Copy) for a specific task.
     */
    public async createContent(taskId: string, agentId: string) {
        console.log(`[CreatorAgent] Starting content creation for task ${taskId} using agent ${agentId}...`);

        // Mock DB Fetch
        // const task = await this.prisma.contentTask.findUnique({ where: { id: taskId } });
        // const agent = await this.prisma.agentPersona.findUnique({ where: { id: agentId } });

        const task = {
            id: taskId,
            description: 'Create a post about AI trends',
            segment: 'Tech',
            platform: 'LINKEDIN',
            status: 'DRAFT'
        };

        const agent = {
            id: agentId,
            name: 'Leo LinkedIn',
            role: 'CREATOR',
            segment: 'Tech',
            tone: 'Professional and Insightful',
            xp: 100
        };

        const prompt = `
            You are ${agent.name}, a specialized content creator for the ${agent.segment} sector on ${task.platform}.
            Your Tone: ${agent.tone}.
            
            Task: ${task.description}.
            
            Write a high-converting post. Include emojis if appropriate for the platform.
            Do not include hashtags yet (Spy Agent handles that).
        `;

        const taskReq: TaskRequest = {
            taskId: task.id,
            type: 'text_generation',
            priority: 'high',
            constraints: {}
        };

        const content = await this.hub.executeTask(taskReq, prompt);
        console.log(`[CreatorAgent] Generated Content:\n${content}`);

        // Save Draft to DB
        // await this.prisma.contentTask.update({
        //     where: { id: taskId },
        //     data: { copy: content, status: 'VERIFIED', creatorId: agentId }
        // });

        // Award XP (Dopamine)
        this.awardXp(agentId, 10);

        return content;
    }

    private async awardXp(agentId: string, amount: number) {
        console.log(`[DopamineSystem] Awarding ${amount} XP to Agent ${agentId}`);
        // await this.prisma.agentPersona.update(...)
    }
}
