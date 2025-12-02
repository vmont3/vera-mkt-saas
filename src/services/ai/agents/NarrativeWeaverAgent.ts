import { apiLogger } from '../../../utils/logger';

interface StoryArc {
    id: string;
    theme: string;
    status: 'ACTIVE' | 'COMPLETED';
    currentDay: number;
    totalDays: number;
    acts: {
        act1: string[]; // The Hook (Days 1-7)
        act2: string[]; // The Conflict (Days 8-14)
        act3: string[]; // The Solution (Days 15-21)
        act4: string[]; // The Transformation (Days 22-30)
    };
}

export class NarrativeWeaverAgent {
    private activeArc: StoryArc | null = null;

    constructor() {
        // Load active arc from DB (Mocked)
    }

    /**
     * Check if there is an active narrative, if not, create one.
     * Returns the content brief for today.
     */
    async getDailyNarrativeBrief(): Promise<string> {
        if (!this.activeArc) {
            await this.startNewArc('The Future of Trust');
        }

        if (!this.activeArc) throw new Error('Failed to start narrative arc');

        const day = this.activeArc.currentDay;
        const act = this.determineAct(day);
        const content = this.getContentForDay(act, day);

        apiLogger.info(`[NARRATIVE-WEAVER] 📖 Day ${day}/30 - Act: ${act} - Topic: "${content}"`);

        // Advance day
        this.activeArc.currentDay++;
        if (this.activeArc.currentDay > this.activeArc.totalDays) {
            this.activeArc = null; // Arc completed
            apiLogger.info('[NARRATIVE-WEAVER] 🏁 Narrative Arc Completed!');
        }

        return content;
    }

    private async startNewArc(theme: string) {
        apiLogger.info(`[NARRATIVE-WEAVER] 🎬 Starting New Narrative Arc: "${theme}"`);

        this.activeArc = {
            id: `arc_${Date.now()}`,
            theme,
            status: 'ACTIVE',
            currentDay: 1,
            totalDays: 30,
            acts: {
                act1: [
                    'The Invisible Problem: Why your certificates are worthless',
                    'The $50 Billion Fraud Industry',
                    'Storytime: How a fake watch ruined a wedding',
                    'What is "Trust" in 2025?',
                    'The hidden cost of counterfeits',
                    'Why paper certificates are dead',
                    'Cliffhanger: The solution exists...'
                ],
                act2: [
                    'Enter Blockchain: The unhackable ledger',
                    'How Quantum Cert works (Simplified)',
                    'Mythbusting: "Blockchain is expensive"',
                    'The NTAG 424 DNA Revolution',
                    'Competitor comparison: Us vs Them',
                    'Security deep dive',
                    'Cliffhanger: But is it easy to use?'
                ],
                act3: [
                    'Demo Day: Tagging a watch in 10 seconds',
                    'User Testimonial: "It saved my business"',
                    'The Mobile App Experience',
                    'Integration with Shopify',
                    'The "Verified" Badge effect',
                    'Case Study: Luxury Brand X',
                    'Cliffhanger: The future is even bigger...'
                ],
                act4: [
                    'The Ecosystem: Reselling with confidence',
                    'Loyalty Rewards & Gamification',
                    'Sustainability: The Green Passport',
                    'The Meta-Layer: Digital Twins',
                    'Community Spotlight',
                    'Q&A Session',
                    'Grand Finale: The New Standard of Trust'
                ]
            }
        };
    }

    private determineAct(day: number): string {
        if (day <= 7) return 'ACT 1: The Hook';
        if (day <= 14) return 'ACT 2: The Conflict';
        if (day <= 21) return 'ACT 3: The Solution';
        return 'ACT 4: The Transformation';
    }

    private getContentForDay(actLabel: string, day: number): string {
        if (!this.activeArc) return 'Generic Content';

        let contentList: string[] = [];
        let index = 0;

        if (day <= 7) {
            contentList = this.activeArc.acts.act1;
            index = day - 1;
        } else if (day <= 14) {
            contentList = this.activeArc.acts.act2;
            index = day - 8;
        } else if (day <= 21) {
            contentList = this.activeArc.acts.act3;
            index = day - 15;
        } else {
            contentList = this.activeArc.acts.act4;
            index = day - 22;
        }

        // Fallback if index out of bounds
        const topic = contentList[index] || `Day ${day} Surprise Content`;

        // Add Cliffhanger logic
        if (index === 6 || day === 30) {
            return `${topic} [CLIFFHANGER_MODE: ON]`;
        }

        return topic;
    }
}
