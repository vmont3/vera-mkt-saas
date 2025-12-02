export interface Interaction {
    id: string;
    type: 'lead_qualificated' | 'post_share' | 'post_save' | 'human_edit' | 'human_rejection' | 'hallucination_detected' | 'mission_success' | 'mission_failure';
    responseTime?: number; // ms
    metadata?: any;
}

export class RewardEngine {
    calculateReward(interaction: Interaction): number {
        const baseRewards: Record<string, number> = {
            'lead_qualificated': 100,
            'post_share': 50, // Simplified from post_50_shares for MVP
            'post_save': 30,  // Simplified from post_10_saves
            'mission_success': 20,
            'human_edit': 5, // Supervised learning (correction)
            'mission_failure': -10,
            'human_rejection': -20,
            'hallucination_detected': -100 // Severe punishment
        };

        const base = baseRewards[interaction.type] || 0;

        // Time Multiplier: Fast leads (< 5 min) are worth 2x
        // 300000 ms = 5 minutes
        let multiplier = 1;
        if (interaction.type === 'lead_qualificated' && interaction.responseTime && interaction.responseTime < 300000) {
            multiplier = 2;
        }

        return base * multiplier;
    }
}
