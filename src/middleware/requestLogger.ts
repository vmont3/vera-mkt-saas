import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url, ip } = req;
    const userId = (req as any).user?.userId || 'anonymous';

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        console.log(
            `[${new Date().toISOString()}] ${method} ${url} ${status} - ${duration}ms - IP: ${ip} - User: ${userId}`
        );
    });

    next();
};
