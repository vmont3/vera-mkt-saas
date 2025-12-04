import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service/AuthService';

const authService = new AuthService();

export class AuthController {
    async login(req: Request, res: Response) {
        try {
            const user = await authService.validateLogin(req.body);
            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            return res.json({ success: true, user });
        } catch (error: any) {
            console.error(`Login failed: ${error.message}`);
            return res.status(401).json({ message: 'Authentication failed' });
        }
    }
}

export const authController = new AuthController();
