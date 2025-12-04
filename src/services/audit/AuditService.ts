import { Logging } from '@google-cloud/logging';

let logging: Logging;

// Mock para pré-produção (não conecta ao Google Cloud)
if (process.env.NODE_ENV === 'production') {
    logging = new Logging({ projectId: process.env.GOOGLE_PROJECT_ID });
} else {
    logging = {
        log: () => ({
            entry: () => ({}),
            write: async () => console.log('[AUDIT MOCK] Log enviado')
        })
    } as any;
}

const log = logging.log('quantum-audit');

export type AuditAction =
    | 'NFT_TRANSFER'
    | 'NFT_MINT'
    | 'KYC_VERIFY'
    | 'KYC_REJECT'
    | 'ADMIN_ACTION'
    | 'USER_LOGIN'
    | 'USER_LOGIN_FAILED';

export interface AuditEntry {
    timestamp: string;
    userId: string;
    action: AuditAction;
    status: 'SUCCESS' | 'FAILURE';
    ip: string;
    userAgent: string;
    metadata: Record<string, any>;
}

export async function auditLog(
    action: AuditAction,
    userId: string,
    status: 'SUCCESS' | 'FAILURE',
    metadata: Record<string, any> = {},
    req?: any
): Promise<void> {
    const entry: AuditEntry = {
        timestamp: new Date().toISOString(),
        userId,
        action,
        status,
        ip: req?.ip || '0.0.0.0',
        userAgent: req?.headers?.['user-agent'] || 'unknown',
        metadata
    };

    try {
        await log.write(log.entry({
            severity: status === 'FAILURE' ? 'ERROR' : 'INFO',
            resource: { type: 'global' },
            labels: { action, userId }
        }, entry));
    } catch (error) {
        console.error('[AUDIT FAIL]', error.message);
    }
}
