import winston from 'winston';
import path from 'path';

/**
 * Audit Logger for Quantum Cert System
 * 
 * Logs all critical operations for security audit trail:
 * - KMS key requests
 * - Encoding operations
 * - Database modifications
 * - API requests
 * - Registry actions
 */

// Create winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'quantum-cert' },
    transports: [
        // Console output for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),

        // File output for production
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log')
        }),
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'audit.log'),
            level: 'info'
        })
    ]
});

export class AuditLogger {
    /**
     * Log KMS key request
     */
    static logKmsRequest(keyName: string, success: boolean, error?: string) {
        logger.info('KMS_KEY_REQUEST', {
            keyName,
            success,
            error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log encoding attempt
     */
    static logEncodingAttempt(params: {
        jobId: string;
        stationId: string;
        status: 'STARTED' | 'SUCCESS' | 'FAILED';
        uid?: string;
        error?: string;
    }) {
        logger.info('ENCODING_ATTEMPT', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log database operation
     */
    static logDbOperation(params: {
        operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
        table: string;
        recordId: string;
        userId?: string;
        changes?: any;
    }) {
        logger.info('DB_OPERATION', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log API request
     */
    static logApiRequest(params: {
        method: string;
        path: string;
        userId?: string;
        ip?: string;
        userAgent?: string;
        statusCode?: number;
        duration?: number;
    }) {
        logger.info('API_REQUEST', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log Registry action
     */
    static logRegistryAction(params: {
        action: 'CREATE_TAG' | 'UPDATE_STATUS' | 'SAVE_UID' | 'RESOLVE_ASSET';
        tagId?: string;
        uid?: string;
        success: boolean;
        error?: string;
    }) {
        logger.info('REGISTRY_ACTION', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log verification attempt
     */
    static logVerification(params: {
        tagId?: string;
        status: 'SUCCESS' | 'FAILED' | 'REPLAY_DETECTED' | 'HASH_MISMATCH';
        ctrValue?: number;
        ip?: string;
        deviceId?: string;
        error?: string;
    }) {
        logger.info('VERIFICATION', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log security event
     */
    static logSecurityEvent(params: {
        eventType: 'REPLAY_ATTACK' | 'CLONE_DETECTED' | 'INVALID_AUTH' | 'KEY_ROTATION';
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        details: any;
    }) {
        logger.warn('SECURITY_EVENT', {
            ...params,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Log general info
     */
    static info(message: string, meta?: any) {
        logger.info(message, { ...meta, timestamp: new Date().toISOString() });
    }

    /**
     * Log warning
     */
    static warn(message: string, meta?: any) {
        logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
    }

    /**
     * Log error
     */
    static error(message: string, error?: Error, meta?: any) {
        logger.error(message, {
            error: error?.message,
            stack: error?.stack,
            ...meta,
            timestamp: new Date().toISOString()
        });
    }
}
