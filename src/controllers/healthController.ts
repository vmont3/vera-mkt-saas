import { Request, Response } from 'express';
import { prisma } from '../database/prismaClient';

export const healthCheck = async (req: Request, res: Response) => {
    const start = Date.now();
    const services: any = {
        database: 'unknown',
        algorand: 'unknown', // Placeholder until Algorand client is accessible here
        encodingWorker: 'unknown'
    };

    // Check Database
    try {
        await prisma.$queryRaw`SELECT 1`;
        services.database = 'ok';
    } catch (error) {
        services.database = 'fail';
    }

    // Check Workers (via heartbeat or queue status)
    // For now, we just check if we can query the queue
    try {
        await prisma.encoderQueue.count();
        services.encodingWorker = 'ok'; // Proxy check
    } catch (error) {
        services.encodingWorker = 'fail';
    }

    const latencyMs = Date.now() - start;
    const status = Object.values(services).every(s => s === 'ok') ? 'ok' : 'degraded';

    res.json({
        status,
        services,
        latencyMs,
        timestamp: new Date().toISOString()
    });
};
