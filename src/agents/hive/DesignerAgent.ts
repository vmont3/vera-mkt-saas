import { IntelligentPartnerHub, TaskRequest } from '../../partners/IntelligentPartnerHub';

export class DesignerAgent {
    private static instance: DesignerAgent;
    private hub: IntelligentPartnerHub;

    private constructor() {
        this.hub = IntelligentPartnerHub.getInstance();
    }

    public static getInstance(): DesignerAgent {
        if (!DesignerAgent.instance) {
            DesignerAgent.instance = new DesignerAgent();
        }
        return DesignerAgent.instance;
    }

    /**
     * Generates an image prompt based on the content copy and platform.
     */
    public async createVisual(taskId: string, copy: string, platform: string) {
        console.log(`[DesignerAgent] Designing visual for task ${taskId}...`);

        const prompt = `
            Act as a World-Class Graphic Designer.
            Based on this social media post copy: "${copy.substring(0, 100)}..."
            Platform: ${platform}.
            
            Generate a detailed image generation prompt (for Midjourney/DALL-E) that perfectly complements this text.
            Describe the style, colors, lighting, and composition.
        `;

        const taskReq: TaskRequest = {
            taskId: `design-${taskId}`,
            type: 'text_generation',
            priority: 'medium',
            constraints: {}
        };

        const imagePrompt = await this.hub.executeTask(taskReq, prompt);
        console.log(`[DesignerAgent] Image Prompt Generated:\n${imagePrompt}`);

        // In a real scenario, we would call DALL-E/Midjourney API here.
        // For now, we save the prompt to the task.

        return imagePrompt;
    }
}
