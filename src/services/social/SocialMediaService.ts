import { prisma } from '../../database/prismaClient';
import { Prisma } from '@prisma/client';
import { AgentOrchestrator } from '../ai/agents/AgentOrchestrator';

// Mock Adapters Interface
interface SocialAdapter {
    post(content: string, media?: any): Promise<string>;
    getInteractions(): Promise<any[]>;
}

// Mock Implementation (Safe Mode)
class MockAdapter implements SocialAdapter {
    private platform: string;

    constructor(platform: string) {
        this.platform = platform;
    }

    async post(content: string, media?: any): Promise<string> {
        console.log(`[MOCK ${this.platform}] Posting: "${content}"`);
        return `mock_post_id_${Date.now()}`;
    }

    async getInteractions(): Promise<any[]> {
        return []; // No real interactions yet
    }
}

export class SocialMediaService {
    private adapters: Record<string, SocialAdapter> = {};
    private cmo: AgentOrchestrator;

    // Phase 8: Central State & Queue
    private pauseState: Record<string, boolean> = {
        'INSTAGRAM': false,
        'WHATSAPP': false,
        'LINKEDIN': false
    };
    private messageQueues: Record<string, any[]> = {
        'INSTAGRAM': [],
        'WHATSAPP': [],
        'LINKEDIN': []
    };

    constructor() {
        // Initialize Mock Adapters
        this.adapters['INSTAGRAM'] = new MockAdapter('INSTAGRAM');
        this.adapters['WHATSAPP'] = new MockAdapter('WHATSAPP');
        this.adapters['LINKEDIN'] = new MockAdapter('LINKEDIN');

        // Initialize AI Marketing Department
        this.cmo = new AgentOrchestrator();
    }

    /**
     * Command Center: Set Pause State
     */
    setPauseState(platform: string, isPaused: boolean) {
        const key = platform.toUpperCase();
        if (this.pauseState.hasOwnProperty(key)) {
            this.pauseState[key] = isPaused;
            console.log(`[SOCIAL-CENTER] ${key} is now ${isPaused ? 'PAUSED' : 'ACTIVE'}`);

            if (!isPaused) {
                this.processQueue(key);
            }
        }
    }

    /**
     * Command Center: Get Pause State
     */
    isPaused(platform: string): boolean {
        return this.pauseState[platform.toUpperCase()] || false;
    }

    /**
     * Handle Incoming Message (Unified Inbox Logic)
     */
    async handleIncomingMessage(platform: string, user: string, text: string) {
        const key = platform.toUpperCase();

        if (this.isPaused(key)) {
            console.log(`[SOCIAL-CENTER] Queuing message from ${platform}/${user}: "${text}"`);
            this.messageQueues[key].push({ user, text, timestamp: new Date() });
            return;
        }

        // TODO: Forward to VeraChatService (Relay) or Auto-Reply
        console.log(`[SOCIAL-CENTER] Processing message from ${platform}/${user}: "${text}"`);
    }

    private async processQueue(platform: string) {
        const queue = this.messageQueues[platform];
        if (queue.length === 0) return;

        console.log(`[SOCIAL-CENTER] Processing ${queue.length} queued messages for ${platform}...`);
        // In a real app, we would batch process or trigger AI catch-up here
        this.messageQueues[platform] = []; // Clear queue
    }

    /**
     * Schedule or Publish a Post
     */
    async createPost(accountId: string, content: string, mediaUrls?: string[]) {
        const account = await prisma.socialAccount.findUnique({ where: { id: accountId } });
        if (!account) throw new Error('Account not found');

        // Save to DB
        const post = await prisma.socialPost.create({
            data: {
                accountId,
                content,
                mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : Prisma.JsonNull,
                status: 'PUBLISHED', // Auto-publish for now
                publishedAt: new Date()
            }
        });

        // Execute via Adapter (Mock)
        const adapter = this.adapters[account.platform];
        if (adapter) {
            const platformId = await adapter.post(content, mediaUrls);

            await prisma.socialPost.update({
                where: { id: post.id },
                data: { platformPostId: platformId }
            });
        }

        return post;
    }

    /**
     * Relay Reply (Admin -> Platform)
     */
    async relayReply(platform: string, user: string, text: string) {
        const adapter = this.adapters[platform.toUpperCase()];
        if (!adapter) throw new Error(`Platform ${platform} not found`);

        console.log(`[SOCIAL-RELAY] Sending to ${platform} user @${user}: "${text}"`);
        // In real implementation: adapter.sendDM(user, text);
        return true;
    }

    /**
     * Generate Content using Vera's Marketing Team
     */
    async generateContent(topic: string, sentiment: 'PROFESSIONAL' | 'CASUAL' = 'PROFESSIONAL') {
        // Map sentiment/topic to Agent Persona
        let category: 'TECH' | 'SUSTAINABILITY' | 'LIFESTYLE' = 'TECH';

        if (topic.toLowerCase().includes('verun') || topic.toLowerCase().includes('sustentabilidade')) {
            category = 'SUSTAINABILITY';
        } else if (sentiment === 'CASUAL') {
            category = 'LIFESTYLE';
        }

        // Delegate to CMO
        const campaign = await this.cmo.createCampaign(topic, category);

        return {
            text: campaign.text,
            media: campaign.media
        };
    }
}
