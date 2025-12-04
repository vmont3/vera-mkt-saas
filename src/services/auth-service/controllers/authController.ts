import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../../../security/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user and wallet transactionally
        const user = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    kycStatus: 'pending'
                },
            });

            // 2. Create Wallet for User
            await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    creditsBalance: 0,
                    moneyAvailable: 0,
                    moneyPending: 0
                }
            });

            return newUser;
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id, 'user');
        const refreshToken = generateRefreshToken(user.id);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully. Please complete KYC.',
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                kycStatus: user.kycStatus,
                nextSteps: ['FACIAL_RECOGNITION', 'SMS_VERIFICATION']
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // Verify password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        // Generate tokens
        const accessToken = generateAccessToken(user.id, 'user'); // Default role 'user' for now
        const refreshToken = generateRefreshToken(user.id);

        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                kycStatus: user.kycStatus
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
