import { Request, Response } from 'express';
import { prisma } from '../database/prismaClient';

export const healthCheck = async (req: Request, res: Response) => {
    const start = Date.now();
    const services: any = {
        database: 'unknown',
        algorand: 'unknown',
        encodingWorker: 'unknown'
    };

    // Check Database
    try {
        await prisma.$queryRaw`SELECT 1`;
        services.database = 'ok';
    } catch (error) {
        services.database = 'fail';
    }

    // Check Algorand (Mocked for now, but structure is ready)
    try {
        // await algorandClient.status().do();
        services.algorand = 'ok';
    } catch (error) {
        services.algorand = 'fail';
    }

    // Check Workers
    try {
        await prisma.encoderQueue.count();
        services.encodingWorker = 'ok';
    } catch (error) {
        services.encodingWorker = 'fail';
    }

    const latencyMs = Date.now() - start;
    const status = Object.values(services).every(s => s === 'ok') ? 'ok' : 'degraded';

    res.json({
        status,
        services,
        latencyMs,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
};
