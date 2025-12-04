import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface AuthConfig {
    jwtSecret: string;
    jwtExpiration: string;
}

export class AuthService {
    private config: AuthConfig;

    constructor(config: AuthConfig = { jwtSecret: 'default', jwtExpiration: '1h' }) {
        this.config = config;
    }

    async validateLogin(body: { email: string; password: string }) {
        const user = await prisma.user.findUnique({ where: { email: body.email } });

        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(body.password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        // Return user without password
        const { password, ...result } = user;
        return result;
    }
}
