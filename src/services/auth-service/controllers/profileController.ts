import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore - userId is attached by attachUser middleware
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch user with wallet
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                kycStatus: true,
                createdAt: true,
                wallet: {
                    select: {
                        creditsBalance: true,
                        moneyAvailable: true,
                        moneyPending: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                kycStatus: user.kycStatus,
                createdAt: user.createdAt,
                wallet: user.wallet || {
                    creditsBalance: 0,
                    moneyAvailable: 0,
                    moneyPending: 0
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
