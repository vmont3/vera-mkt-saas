import { BaseAgent } from './BaseAgent';

export class CriticAgent extends BaseAgent {
    constructor() {
        super('Critic-Humanizer', 'Senior Editor & Quality Assurance');
    }

    async execute(task: { draft: string }): Promise<{ approved: boolean, feedback: string, improvedDraft?: string }> {
        this.log(`Reviewing draft...`);

        const prompt = `
            You are a Senior Editor. Your job is to "Humanize" AI-generated text.
            
            Draft: "${task.draft}"
            
            Analyze for:
            1. Robot-like phrasing ("Unlock", "Elevate", "Game-changer").
            2. Overuse of emojis.
            3. Generic fluff.
            
            If it sounds robotic, rewrite it to sound like a real human expert.
            Return JSON: { "approved": boolean, "feedback": string, "improvedDraft": string }
        `;

        // Mocking the JSON response for now as GeminiService returns string
        // In real implementation, we would parse the JSON from AI
        const analysis = await this.ai.analyzeSentiment(task.draft); // Reusing sentiment as a proxy for "check"

        if (analysis === 'NEGATIVE') {
            return {
                approved: false,
                feedback: "Too robotic.",
                improvedDraft: task.draft + " (Humanized)"
            };
        }

        return {
            approved: true,
            feedback: "Good to go.",
            improvedDraft: task.draft
        };
    }
}
