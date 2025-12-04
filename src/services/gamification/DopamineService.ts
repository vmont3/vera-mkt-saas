import { PrismaClient } from '@prisma/client';

export class DopamineService {
    private static instance: DopamineService;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): DopamineService {
        if (!DopamineService.instance) {
            DopamineService.instance = new DopamineService();
        }
        return DopamineService.instance;
    }

    public async awardXp(agentId: string, amount: number, reason: string) {
        console.log(`[DopamineService] 🌟 Awarding ${amount} XP to Agent ${agentId} for: ${reason}`);

        // Mock DB Update
        // const agent = await this.prisma.agentPersona.update({
        //     where: { id: agentId },
        //     data: { xp: { increment: amount } }
        // });

        // this.checkLevelUp(agent);
    }

    public async penalizeXp(agentId: string, amount: number, reason: string) {
        console.log(`[DopamineService] ⚠️ Penalizing ${amount} XP from Agent ${agentId} for: ${reason}`);

        // Mock DB Update
        // await this.prisma.agentPersona.update({
        //     where: { id: agentId },
        //     data: { xp: { decrement: amount } }
        // });
    }

    private checkLevelUp(agent: any) {
        const nextLevelXp = agent.level * 1000;
        if (agent.xp >= nextLevelXp) {
            console.log(`[DopamineService] 🆙 LEVEL UP! Agent ${agent.name} is now Level ${agent.level + 1}!`);
            // Update level
        }
    }
}
