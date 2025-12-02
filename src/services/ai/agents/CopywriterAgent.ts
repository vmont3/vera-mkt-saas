import { BaseAgent } from './BaseAgent';

export class CopywriterAgent extends BaseAgent {
    constructor(persona: 'TECH' | 'LIFESTYLE' | 'SUSTAINABILITY') {
        super(`Copywriter-${persona}`, `Expert Copywriter in ${persona}`);
    }

    async execute(task: { topic: string, context: string }): Promise<string> {
        this.log(`Drafting content for topic: ${task.topic}`);

        const style = this.name.includes('TECH') ? 'Technical and Authoritative' :
            this.name.includes('SUSTAINABILITY') ? 'Eco-conscious and Inspiring' :
                'Casual and Engaging';

        const prompt = `
            You are an expert copywriter.
            Role: ${this.role}
            Style: ${style}
            
            Task: Write a social media post about "${task.topic}".
            Context: ${task.context}
            
            Rules:
            1. Use engaging hooks.
            2. Include relevant emojis.
            3. Add 3-5 hashtags.
            4. NO "AI language" (e.g., "In the realm of...", "Unlock the power...").
        `;

        return await this.ai.generateContent(task.topic, task.context, 'PROFESSIONAL'); // Using existing method as proxy
    }
}
