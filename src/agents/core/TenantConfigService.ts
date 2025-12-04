import { apiLogger } from '../../../utils/logger';

export interface TenantConfig {
    id: string;
    name: string;
    apiKey: string;
    brandVoice: {
        tone: string;
        keywords: string[];
        bannedKeywords: string[];
    };
    goals: {
        primary: 'CONVERSION' | 'AWARENESS' | 'ENGAGEMENT';
        targetAudience: string;
    };
    postingSchedule: string[];
}

export class TenantConfigService {
    private tenants: Map<string, TenantConfig> = new Map();

    constructor() {
        // Mock Data: In real app, load from DB (Prisma)
        this.initializeMockTenants();
    }

    private initializeMockTenants() {
        // Tenant 1: Quantum Cert (The Core Product)
        this.tenants.set('sk_live_quantum_123', {
            id: 'quantum-core',
            name: 'Quantum Cert',
            apiKey: 'sk_live_quantum_123',
            brandVoice: {
                tone: 'Professional, Secure, Authoritative, Tech-Savvy',
                keywords: ['Blockchain', 'Security', 'Trust', 'NTAG 424', 'Anti-Counterfeit'],
                bannedKeywords: ['Cheap', 'Discount', 'Promo', 'Hype']
            },
            goals: {
                primary: 'CONVERSION',
                targetAudience: 'Luxury Brands, B2B, Watch Collectors'
            },
            postingSchedule: ['09:00', '14:00']
        });

        // Tenant 2: Verun (The Eco-Friendly Spin-off)
        this.tenants.set('sk_live_verun_456', {
            id: 'verun-eco',
            name: 'Verun',
            apiKey: 'sk_live_verun_456',
            brandVoice: {
                tone: 'Inspiring, Eco-Friendly, Gen-Z, Vibrant',
                keywords: ['Sustainability', 'Green', 'Circular Economy', 'Resale', 'Community'],
                bannedKeywords: ['Corporate', 'Bureaucracy', 'Complex']
            },
            goals: {
                primary: 'ENGAGEMENT',
                targetAudience: 'Gen Z, Eco-Conscious Consumers'
            },
            postingSchedule: ['12:00', '19:00'] // Golden Window for Gen Z
        });
    }

    /**
     * Validate API Key and return Tenant Config
     */
    async getTenantByApiKey(apiKey: string): Promise<TenantConfig | null> {
        const tenant = this.tenants.get(apiKey);
        if (!tenant) {
            apiLogger.warn(`[TENANT-AUTH] Invalid API Key attempt: ${apiKey}`);
            return null;
        }
        return tenant;
    }

    /**
     * Get Tenant by ID (Internal use)
     */
    async getTenantById(tenantId: string): Promise<TenantConfig | null> {
        const tenant = Array.from(this.tenants.values()).find(t => t.id === tenantId);
        return tenant || null;
    }
}
