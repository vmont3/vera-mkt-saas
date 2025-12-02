import { Request, Response } from 'express';
import { prisma } from '../../database/prismaClient';

export class GrowthController {

    /**
     * Get Opportunities for Vera (AI Assistant)
     * GET /admin/growth/opportunities
     */
    static async getOpportunities(req: Request, res: Response) {
        try {
            const { limit = 50 } = req.query;

            // Fetch personas with pending opportunities
            const personas = await prisma.userPersona.findMany({
                where: {
                    opportunities: {
                        not: Prisma.JsonNull
                    }
                },
                take: Number(limit),
                include: {
                    user: { select: { email: true, id: true } }
                }
            });

            // Flatten opportunities
            const allOpportunities = personas.flatMap(p => {
                const opps = p.opportunities as any[]; // Cast to array
                if (Array.isArray(opps)) {
                    return opps.map(o => ({
                        ...o,
                        userId: p.userId,
                        userEmail: p.user.email
                    }));
                }
                return [];
            });

            // Sort by priority
            allOpportunities.sort((a, b) => b.priority - a.priority);

            res.json({
                count: allOpportunities.length,
                opportunities: allOpportunities
            });

        } catch (error) {
            console.error('Growth Controller Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

import { Prisma } from '@prisma/client';
