import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt';
import { checkRole, Role } from './rbac';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const attachUser = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return next();
    }

    const decoded = verifyAccessToken(token);
    if (decoded) {
        req.user = decoded;
    }
    next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

export const requireRole = (roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !checkRole(req.user.role, roles)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};
