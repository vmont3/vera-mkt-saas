import axios from 'axios';

const partnerClient = axios.create({
    timeout: 5000, // 5 seconds
    retries: 3,
    retryDelay: (retryCount: number) => retryCount * 1000,
} as any); // cast to any because axios-retry types might be missing

interface PartnerEvent {
    partner: 'ERECYCLE' | 'MATCH' | 'BIKELOCK';
    type: string;
    data: any;
}

export class PartnerIntegrationHub {

    async onPartnerEvent(event: PartnerEvent) {
        console.log(`[PARTNER-HUB] Received event from ${event.partner}: ${event.type}`);

        switch (event.partner) {
            case 'ERECYCLE':
                if (event.type === 'recycling_milestone') {
                    await this.handleRecyclingMilestone(event.data);
                }
                break;

            case 'MATCH':
                if (event.type === 'new_member') {
                    await this.handleNewMatchMember(event.data);
                }
                break;

            default:
                console.warn(`[PARTNER-HUB] Unknown partner: ${event.partner}`);
        }
    }

    private async handleRecyclingMilestone(data: any) {
        // Logic: Create a celebratory post or grant points
        console.log(`[PARTNER-HUB] eRecycle Milestone: User ${data.userId} recycled ${data.amount}kg!`);
        // Trigger QuestEngine (Future)
        // await questEngine.updateProgress(data.userId, 'recycling_hero', data.amount);
    }

    private async handleNewMatchMember(data: any) {
        // Logic: Cross-sell Quantum Cert
        console.log(`[PARTNER-HUB] New Match Member: ${data.userId}. Sending welcome offer.`);
        // Trigger Email/Notification
    }

    async callPartnerAPI(url: string, data: any) {
        try {
            return await partnerClient.post(url, data);
        } catch (error: any) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Partner API timeout');
            }
            throw error;
        }
    }
}
