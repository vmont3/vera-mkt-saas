import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class UserService {

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
}
