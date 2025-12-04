import { IntelligentPartnerHub } from '../../../partners/IntelligentPartnerHub';
import { VerifierAgent } from './VerifierAgent';
// import { VeraCommandCenter } from '../../vcs/VeraCommandCenter'; // Circular dependency risk, will handle via event or direct call later

export class SupervisorAgent {
    private static instance: SupervisorAgent;
    private verifier: VerifierAgent;

    private constructor() {
        this.verifier = VerifierAgent.getInstance();
    }

    public static getInstance(): SupervisorAgent {
        if (!SupervisorAgent.instance) {
            SupervisorAgent.instance = new SupervisorAgent();
        }
        return SupervisorAgent.instance;
    }

    /**
     * Orchestrates the review process.
     */
    public async reviewAndSubmit(taskId: string, copy: string, imagePrompt: string) {
        console.log(`[SupervisorAgent] Starting final review for task ${taskId}...`);

        // 1. Call Verifier
        const verification = await this.verifier.verifyContent(taskId, copy, 'General Audience');

        if (!verification.approved) {
            console.log(`[SupervisorAgent] Content REJECTED by Verifier. Sending back to Creator.`);
            console.log(`Reason: ${verification.feedback}`);
            // Logic to loop back to Creator would go here (update DB status to REJECTED)
            return;
        }

        console.log(`[SupervisorAgent] Content APPROVED by Verifier. Preparing for Admin Vote.`);

        // 2. Trigger Telegram Voting (Mocking the call to Command Center)
        // const vcs = VeraCommandCenter.getInstance();
        // await vcs.createPoll(taskId, copy, imagePrompt);

        console.log(`[SupervisorAgent] Voting Poll sent to Telegram for Task ${taskId}.`);
    }
}
