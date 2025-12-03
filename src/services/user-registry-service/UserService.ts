import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

import { NftService } from '../assets/NftService';

export class UserService {
    private nftService: NftService | null = null;

    setNftService(service: NftService) {
        this.nftService = service;
    }

    /**
     * Search users by name or email securely.
     * Demonstrates fix for SQL Injection by using Prisma.sql template tag.
     * 
     * VULNERABLE VERSION (DO NOT USE):
     * await prisma.$queryRawUnsafe(`SELECT * FROM "User" WHERE email LIKE '%${query}%'`);
     */
    async searchUsers(query: string) {
        // SECURE IMPLEMENTATION
        // Prisma.sql creates a Prepared Statement, preventing injection.
        const users = await prisma.$queryRaw<any[]>(
            Prisma.sql`SELECT id, email, "kycStatus" FROM "User" WHERE email ILIKE ${`%${query}%`}`
        );

        return users;
    }

    /**
     * Get user by ID securely
     */
    async getUserById(userId: string) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, kycStatus: true }
        });
    }

    /**
     * Create user with Zod validation
     */
    async createUser(data: unknown) {
        const userSchema = z.object({
            email: z.string().email(),
            cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
            name: z.string().min(3).max(100),
            password: z.string().min(8)
        });

        const validated = userSchema.parse(data);
        return prisma.user.create({ data: validated });
    }
}
