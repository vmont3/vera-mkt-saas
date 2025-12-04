import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('security-audit');

export interface SecurityEvent {
    type: 'AUTH_FAILURE' | 'SQL_INJECTION_ATTEMPT' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_BREACH' | 'ADMIN_ACTION';
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    userId?: string;
    ip?: string;
    details: any;
    timestamp?: Date;
}

export class SecurityMonitor {

    /**
     * Log a security event to Cloud Logging
     */
    static async log(event: SecurityEvent) {
        const metadata = {
            severity: event.severity,
            resource: { type: 'global' }
        };

        const entry = log.entry(metadata, {
            ...event,
            timestamp: event.timestamp || new Date(),
            environment: process.env.NODE_ENV || 'development'
        });

        // Async write to avoid blocking main thread
        log.write(entry).catch(err => console.error('[SECURITY-MONITOR] Failed to write log:', err));

        // Console fallback for dev
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[SECURITY] [${event.severity}] ${event.type}:`, event.details);
        }

        // Trigger Alerts for Critical Events
        if (event.severity === 'CRITICAL') {
            await this.triggerPagerDuty(event);
        }
    }

    private static async triggerPagerDuty(event: SecurityEvent) {
        // Mock PagerDuty Integration
        console.error(`[PAGERDUTY] 🚨 CRITICAL SECURITY ALERT: ${event.type}`, event);
        // In real impl: axios.post('https://events.pagerduty.com/v2/enqueue', ...)
    }
}
