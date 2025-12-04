import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Error 18: HTTP Parameter Pollution Fix
export const hppMiddleware = (req: Request, res: Response, next: NextFunction) => {
    Object.keys(req.query).forEach(key => {
        if (Array.isArray(req.query[key])) {
            req.query[key] = req.query[key][0] as any;
        }
    });
    next();
};

// Error 23: Request ID Fix
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    (req as any).id = uuidv4();
    res.setHeader('X-Request-ID', (req as any).id);
    next();
};

// Error 22: Sensitive Headers Fix
export const headerCleanupMiddleware = (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('Server');
    res.removeHeader('X-Powered-By'); // Redundant if app.disable is used, but safe
    next();
};
