import { prisma } from '../../database/prismaClient';
import { Prisma } from '@prisma/client';

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

    constructor() {
        // Initialize Mock Adapters
        this.adapters['INSTAGRAM'] = new MockAdapter('INSTAGRAM');
        this.adapters['WHATSAPP'] = new MockAdapter('WHATSAPP');
        this.adapters['LINKEDIN'] = new MockAdapter('LINKEDIN');
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
     * Generate Content using Vera's Context (Mock AI)
     */
    async generateContent(topic: string, sentiment: 'PROFESSIONAL' | 'CASUAL' = 'PROFESSIONAL') {
        // In a real scenario, this would call an LLM
        return `[Vera Generated] Here is a ${sentiment.toLowerCase()} post about ${topic}. #QuantumCert #Security`;
    }
}
