import winston from 'winston';
import path from 'path';

// Ensure logs directory exists
const logDir = 'logs';

// Custom format for JSON logging
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

// Mask sensitive fields
export const maskSensitive = (obj: any): any => {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'uid', 'truncatedHash', 'falconMasterHash', 'mac', 'signature'];
    const maskedObj = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key in maskedObj) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
            if (typeof maskedObj[key] === 'string' && maskedObj[key].length > 8) {
                maskedObj[key] = maskedObj[key].substring(0, 4) + '****';
            } else {
                maskedObj[key] = '****';
            }
        } else if (typeof maskedObj[key] === 'object') {
            maskedObj[key] = maskSensitive(maskedObj[key]);
        }
    }
    return maskedObj;
};

// Create Logger Factory
const createLogger = (service: string, filename: string) => {
    return winston.createLogger({
        level: 'info',
        format: jsonFormat,
        defaultMeta: { service },
        transports: [
            new winston.transports.File({ filename: path.join(logDir, filename), maxsize: 5242880, maxFiles: 7 }), // 5MB, 7 files
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ]
    });
};

export const apiLogger = createLogger('api-service', 'api.log');
export const errorLogger = createLogger('error-service', 'error.log');
export const securityLogger = createLogger('security-service', 'security.log');
export const blockchainLogger = createLogger('blockchain-service', 'blockchain.log');
export const encodingLogger = createLogger('encoding-service', 'encoding.log');
export const auditLogger = createLogger('audit-service', 'audit.log');
