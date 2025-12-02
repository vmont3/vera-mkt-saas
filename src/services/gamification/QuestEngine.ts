interface Quest {
    id: string;
    name: string;
    description: string;
    rewardPoints: number;
    condition: (userId: string) => Promise<boolean>;
}

export class QuestEngine {
    private quests: Quest[] = [];

    constructor() {
        this.initializeQuests();
    }

    private initializeQuests() {
        this.quests = [
            {
                id: 'sustainability_chain',
                name: 'Cadeia de Proteção Sustentável',
                description: 'Registre 1 item na Quantum + descarte 1 eletrônico no e-recycle',
                rewardPoints: 100,
                condition: async (userId: string) => {
                    // Mock check
                    // const hasItem = await quantum.userHasItem(userId);
                    // const hasRecycled = await erecycle.userHasRecycled(userId);
                    // return hasItem && hasRecycled;
                    return Math.random() > 0.5; // Random success for MVP
                }
            }
        ];
    }

    async checkQuestCompletion(userId: string, action: string) {
        console.log(`[QUEST] Checking quests for user ${userId} after action: ${action}`);

        for (const quest of this.quests) {
            // In real logic, we filter relevant quests based on action
            const completed = await quest.condition(userId);

            if (completed) {
                console.log(`[QUEST] 🎉 User ${userId} completed quest: ${quest.name}!`);
                await this.grantReward(userId, quest.rewardPoints);
            }
        }
    }

    private async grantReward(userId: string, points: number) {
        console.log(`[QUEST] Granting ${points} points to ${userId}.`);
        // await walletService.addCredits(userId, points);
    }
}
