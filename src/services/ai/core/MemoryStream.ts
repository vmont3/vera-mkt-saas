import { RewardEngine, Interaction } from './RewardEngine';

// Mock Pinecone Client for MVP
class MockVectorDB {
    private logs: any[] = [];

    async upsert(data: any) {
        this.logs.push(data);
        console.log(`[MEMORY] Upserted vector for ${data.id}. Reward: ${data.metadata.reward}`);
    }

    async query(filter: any) {
        // Mock query returning high-reward patterns
        return this.logs
            .filter(l => l.metadata.reward > (filter.filter?.reward?.$gt || 0))
            .slice(0, filter.topK || 10);
    }
}

export class MemoryStream {
    private vectorDB: MockVectorDB;
    private rewardEngine: RewardEngine;

    constructor() {
        this.vectorDB = new MockVectorDB();
        this.rewardEngine = new RewardEngine();
    }

    /**
     * Log an interaction to the "Brain"
     */
    async logInteraction(interaction: Interaction & { text: string, persona: string, channel: string, company?: string }) {
        // 1. Calculate Reward
        const reward = this.rewardEngine.calculateReward(interaction);

        // 2. Generate Embedding (Mocked for now)
        const embedding = await this.mockEmbed(interaction.text);

        // 3. Store in Vector DB
        await this.vectorDB.upsert({
            id: interaction.id,
            values: embedding,
            metadata: {
                persona: interaction.persona,
                outcome: reward > 0 ? 'positive' : 'negative',
                reward: reward,
                channel: interaction.channel,
                timestamp: Date.now(),
                company_ref: interaction.company || 'quantumcert'
            }
        });

        return reward;
    }

    /**
     * Retrieve successful patterns for a persona
     */
    async getWinningPatterns(persona: string, limit: number = 5) {
        return await this.vectorDB.query({
            topK: limit,
            filter: {
                persona: persona,
                reward: { $gt: 10 } // Only positive reinforcement
            }
        });
    }

    private async mockEmbed(text: string): Promise<number[]> {
        // Simulate a 1536-dim vector (OpenAI/Gemini standard)
        return new Array(1536).fill(0).map(() => Math.random());
    }
}
