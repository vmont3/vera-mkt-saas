import { IntelligentPartnerHub, TaskRequest } from '../partners/IntelligentPartnerHub';

export interface PersonaConfig {
    id: string;
    name: string;
    role: 'sales' | 'support' | 'technical' | 'creative';
    tone: string;
    knowledgeBaseIds: string[];
}

export interface MessageContext {
    platform: 'whatsapp' | 'telegram' | 'web';
    userId: string;
    content: string;
}

export class MultiPlatformPersonaAgent {
    private persona: PersonaConfig;
    private hub: IntelligentPartnerHub;

    constructor(persona: PersonaConfig) {
        this.persona = persona;
        this.hub = IntelligentPartnerHub.getInstance();
    }

    /**
     * Processes an incoming message using the persona's configuration.
     */
    public async handleMessage(context: MessageContext): Promise<string> {
        console.log(`[Agent: ${this.persona.name}] Received message from ${context.platform}`);

        // Construct prompt based on persona
        const systemPrompt = `You are ${this.persona.name}, a ${this.persona.role} assistant. Tone: ${this.persona.tone}.`;
        const fullPrompt = `${systemPrompt}\nUser: ${context.content}`;

        // Determine task requirements based on role
        const task: TaskRequest = {
            taskId: `task-${Date.now()}`,
            type: 'text_generation',
            priority: this.persona.role === 'sales' ? 'high' : 'medium',
            constraints: {}
        };

        // Execute via Partner Hub
        const response = await this.hub.executeTask(task, fullPrompt);

        return this.formatResponse(response, context.platform);
    }

    /**
     * Formats the response for the specific platform.
     */
    private formatResponse(text: string, platform: string): string {
        if (platform === 'whatsapp') {
            return `*${this.persona.name}*: ${text}`; // Bold name for WhatsApp
        } else if (platform === 'telegram') {
            return `**${this.persona.name}**: ${text}`; // Markdown for Telegram
        }
        return text;
    }
}
