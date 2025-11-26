import { Request, Response, NextFunction } from 'express';
import { verifyServiceToken } from '../security/serviceToken';

export const serviceAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['x-service-token'] as string;

    if (!token) {
        return res.status(403).json({ error: 'Forbidden', message: 'Missing service token' });
    }

    const decoded = verifyServiceToken(token);

    if (!decoded) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid service token' });
    }

    // Attach service info to request if needed
    (req as any).service = decoded;

    next();
};
