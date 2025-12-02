import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Secret key for HMAC (In production, this should be in a vault)
const AUDIT_SECRET = process.env.AUDIT_SECRET || 'default-audit-secret-key-change-me';

export class AuditLogService {
    /**
     * Log an event with cryptographic chain-of-custody
     */
    async log(params: {
        eventType: string;
        severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        actorType: 'USER' | 'SYSTEM' | 'API' | 'WORKER' | 'PUBLIC' | 'PARTNER' | 'ADMIN';
        actorId?: string;
        assetId?: string;
        payload?: any;
    }) {
        try {
            // 1. Get the last log's hash to form the chain
            const lastLog = await prisma.auditLog.findFirst({
                orderBy: { timestamp: 'desc' }
            });

            const hashChainPrev = lastLog ? lastLog.hashChainThis : 'GENESIS_HASH';

            // 2. Prepare data for hashing
            const timestamp = new Date();
            const logData = {
                timestamp: timestamp.toISOString(),
                eventType: params.eventType,
                severity: params.severity,
                actorType: params.actorType,
                actorId: params.actorId,
                assetId: params.assetId,
                payload: params.payload,
                hashChainPrev
            };

            // 3. Calculate current hash: SHA256(JSON(data))
            const dataString = JSON.stringify(logData);
            const hashChainThis = crypto.createHash('sha256').update(dataString).digest('hex');

            // 4. Sign the hash: HMAC-SHA256(secret, hashChainThis)
            const signature = crypto.createHmac('sha256', AUDIT_SECRET).update(hashChainThis).digest('hex');

            // 5. Persist to DB
            await prisma.auditLog.create({
                data: {
                    timestamp,
                    eventType: params.eventType,
                    severity: params.severity,
                    actorType: params.actorType,
                    actorId: params.actorId,
                    assetId: params.assetId,
                    payload: params.payload || {},
                    hashChainPrev,
                    hashChainThis,
                    signature
                }
            });

            // console.log(`🔒 AuditLog: ${params.eventType} [${hashChainThis.substring(0, 8)}...]`);

        } catch (error) {
            console.error('❌ Failed to write AuditLog:', error);
            // In a real high-security system, we might want to halt operations if audit fails.
            // For now, we just log the error to console.
        }
    }

    /**
     * Verify the integrity of the audit log chain for a specific asset or globally
     */
    async verifyChainIntegrity(limit: number = 100): Promise<{ valid: boolean; brokenAtId?: string; reason?: string }> {
        const logs = await prisma.auditLog.findMany({
            orderBy: { timestamp: 'asc' },
            take: limit
        });

        if (logs.length === 0) return { valid: true };

        let prevHash = 'GENESIS_HASH';

        for (const log of logs) {
            // 1. Verify Link: prevHash matches
            if (log.hashChainPrev !== prevHash) {
                return {
                    valid: false,
                    brokenAtId: log.id,
                    reason: `Broken Chain: Expected prevHash ${prevHash}, got ${log.hashChainPrev}`
                };
            }

            // 2. Re-calculate Hash
            const logData = {
                timestamp: log.timestamp.toISOString(),
                eventType: log.eventType,
                severity: log.severity,
                actorType: log.actorType,
                actorId: log.actorId,
                assetId: log.assetId,
                payload: log.payload,
                hashChainPrev: log.hashChainPrev
            };
            const dataString = JSON.stringify(logData);
            const calculatedHash = crypto.createHash('sha256').update(dataString).digest('hex');

            if (calculatedHash !== log.hashChainThis) {
                return {
                    valid: false,
                    brokenAtId: log.id,
                    reason: `Data Tampered: Hash mismatch. Calculated ${calculatedHash}, stored ${log.hashChainThis}`
                };
            }

            // 3. Verify Signature
            const calculatedSig = crypto.createHmac('sha256', AUDIT_SECRET).update(calculatedHash).digest('hex');
            if (calculatedSig !== log.signature) {
                return {
                    valid: false,
                    brokenAtId: log.id,
                    reason: `Invalid Signature: Calculated ${calculatedSig}, stored ${log.signature}`
                };
            }

            prevHash = log.hashChainThis;
        }

        return { valid: true };
    }

    /**
     * Retrieve logs for a specific asset
     */
    async getLogsForAsset(assetId: string) {
        return prisma.auditLog.findMany({
            where: { assetId },
            orderBy: { timestamp: 'desc' }
        });
    }
}
