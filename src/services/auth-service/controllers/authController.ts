import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../../../security/jwt';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // const hashedPassword = await bcrypt.hash(password, 10);

        // Simulate user creation
        // const user = await prisma.user.create({
        //   data: {
        //     email,
        //     // password: hashedPassword, // Note: Schema doesn't have password field yet, assuming it will be added or handled via identity service
        //   },
        // });

        // For now, just return success
        return res.status(201).json({ success: true, message: 'User registered successfully (simulation)' });
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

        // Simulate user lookup
        // const user = await prisma.user.findUnique({ where: { email } });
        // if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        // Simulate password check
        // const isValid = await bcrypt.compare(password, user.password);
        // if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        // Mock user for token generation
        const mockUserId = 'user-uuid-placeholder';
        const mockRole = 'user';

        const accessToken = generateAccessToken(mockUserId, mockRole);
        const refreshToken = generateRefreshToken(mockUserId);

        return res.json({
            accessToken,
            refreshToken,
            user: {
                id: mockUserId,
                email,
                role: mockRole
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
