import { Request, Response } from 'express';
import { SocialMediaService } from './SocialMediaService';
import { prisma } from '../../database/prismaClient';

const socialService = new SocialMediaService();

export class SocialController {

    /**
     * Create a new Social Account (Mock Connection)
     * POST /admin/social/accounts
     */
    static async connectAccount(req: Request, res: Response) {
        try {
            const { platform, username } = req.body;

            const account = await prisma.socialAccount.create({
                data: {
                    platform,
                    username,
                    accessToken: 'mock_token', // Safe mode
                    status: 'ACTIVE'
                }
            });

            res.json(account);
        } catch (error) {
            res.status(500).json({ error: 'Failed to connect account' });
        }
    }

    /**
     * Create and Publish a Post
     * POST /admin/social/posts
     */
    static async createPost(req: Request, res: Response) {
        try {
            const { accountId, content, mediaUrls } = req.body;
            const post = await socialService.createPost(accountId, content, mediaUrls);
            res.json(post);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create post' });
        }
    }

    /**
     * Generate AI Content
     * POST /admin/social/generate
     */
    static async generateContent(req: Request, res: Response) {
        try {
            const { topic, style } = req.body;
            const content = await socialService.generateContent(topic, style);
            res.json({ content });
        } catch (error) {
            res.status(500).json({ error: 'Failed to generate content' });
        }
    }
}
