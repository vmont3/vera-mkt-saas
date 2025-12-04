import { IntelligentPartnerHub, TaskRequest } from '../../partners/IntelligentPartnerHub';
import { PrismaClient } from '@prisma/client';

export class GeneralManagerAgent {
    private static instance: GeneralManagerAgent;
    private hub: IntelligentPartnerHub;
    private prisma: PrismaClient;

    private constructor() {
        this.hub = IntelligentPartnerHub.getInstance();
        this.prisma = new PrismaClient();
    }

    public static getInstance(): GeneralManagerAgent {
        if (!GeneralManagerAgent.instance) {
            GeneralManagerAgent.instance = new GeneralManagerAgent();
        }
        return GeneralManagerAgent.instance;
    }

    /**
     * Receives a task (from Spy or Admin) and delegates it to the appropriate Creator.
     */
    public async processTask(taskId: string) {
        console.log(`[GeneralManager] Processing task ${taskId}...`);

        // Mock DB fetch
        // const task = await this.prisma.contentTask.findUnique({ where: { id: taskId } });
        const task = {
            id: taskId,
            description: 'Create a post about AI trends',
            segment: 'Tech',
            platform: 'LINKEDIN',
            status: 'IDEA'
        };

        if (!task) return;

        console.log(`[GeneralManager] Delegating to ${task.segment} Creator for ${task.platform}...`);

        // Logic to find the right agent (Mocked)
        // const creator = await this.prisma.agentPersona.findFirst({
        //     where: { role: 'CREATOR', segment: task.segment, platform: task.platform }
        // });

        // Call Creator Agent (Placeholder for next step)
        // await PlatformCreatorAgent.execute(task);

        // For now, just log
        console.log(`[GeneralManager] Task ${taskId} delegated successfully.`);
    }

    /**
     * Fallback mechanism: If no trends found, generate generic engagement content.
     */
    public async handleFallback(segment: string, platform: string) {
        console.log(`[GeneralManager] No trends found for ${segment}. Initiating Fallback Protocol.`);

        const prompt = `
            Act as a Social Media Manager.
            My Spy Agent found no viral trends today for ${segment} on ${platform}.
            Generate an "Evergreen" engagement post idea to keep the audience active.
            Focus on: Community building, Questions, or Behind-the-scenes.
        `;

        const taskReq: TaskRequest = {
            taskId: `fallback-${Date.now()}`,
            type: 'text_generation',
            priority: 'medium',
            constraints: {}
        };

        const idea = await this.hub.executeTask(taskReq, prompt);
        console.log(`[GeneralManager] Fallback Idea: ${idea}`);

        // Create Task in DB
        // await this.prisma.contentTask.create(...)
    }
}
