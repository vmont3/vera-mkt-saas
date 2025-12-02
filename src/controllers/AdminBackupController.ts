import { Request, Response } from 'express';
import { BackupService } from '../services/backup/BackupService';
import { DisasterRecoveryService } from '../services/backup/DisasterRecoveryService';
import { auditLogger } from '../utils/logger';

const backupService = new BackupService();
const drService = new DisasterRecoveryService();

export const listBackups = async (req: Request, res: Response) => {
    try {
        const backups = await backupService.listBackups();
        res.json(backups);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const runBackup = async (req: Request, res: Response) => {
    try {
        const { type = 'FULL' } = req.body;
        const backup = await backupService.createBackup({ type, encrypt: true });

        auditLogger.info('Manual backup triggered', { type, backupId: backup.id });
        res.json(backup);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const verifyBackup = async (req: Request, res: Response) => {
    try {
        const { backupId } = req.body;
        const isValid = await backupService.verifyBackup(backupId);

        auditLogger.info('Manual backup verification', { backupId, isValid });
        res.json({ valid: isValid });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const runIntegrityCheck = async (req: Request, res: Response) => {
    try {
        const report = await drService.runIntegrityAudit();
        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const simulateFailover = async (req: Request, res: Response) => {
    try {
        const result = await drService.simulateFailover();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
