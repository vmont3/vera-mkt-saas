import { IntelligentPartnerHub, TaskRequest } from '../../../partners/IntelligentPartnerHub';

export class VerifierAgent {
    private static instance: VerifierAgent;
    private hub: IntelligentPartnerHub;

    private constructor() {
        this.hub = IntelligentPartnerHub.getInstance();
    }

    public static getInstance(): VerifierAgent {
        if (!VerifierAgent.instance) {
            VerifierAgent.instance = new VerifierAgent();
        }
        return VerifierAgent.instance;
    }

    /**
     * Verifies content for AI hallucinations, robotic tone, and brand alignment.
     */
    public async verifyContent(taskId: string, copy: string, context: string): Promise<{ approved: boolean; feedback: string }> {
        console.log(`[VerifierAgent] Auditing content for task ${taskId}...`);

        const prompt = `
            Act as a Strict Content Editor and Fact Checker.
            Review the following social media post:
            "${copy}"
            
            Context: ${context}
            
            Check for:
            1. AI Hallucinations (False facts).
            2. Robotic/AI Tone (Vices of language like "Delve", "Unlock", "Revolutionize" overuse).
            3. Alignment with the context.
            
            Output strictly in this format:
            STATUS: [APPROVED | REJECTED]
            FEEDBACK: [Brief explanation]
        `;

        const taskReq: TaskRequest = {
            taskId: `verify-${taskId}`,
            type: 'text_generation',
            priority: 'high',
            constraints: {}
        };

        const analysis = await this.hub.executeTask(taskReq, prompt);
        console.log(`[VerifierAgent] Analysis Result:\n${analysis}`);

        const isApproved = analysis.includes('STATUS: APPROVED');
        const feedback = analysis.split('FEEDBACK:')[1]?.trim() || analysis;

        return { approved: isApproved, feedback };
    }
}
