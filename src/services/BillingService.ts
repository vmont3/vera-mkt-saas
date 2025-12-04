import { PrismaClient } from '@prisma/client';

export interface UsageRecord {
    tenantId: string;
    metric: 'api_calls' | 'storage_mb' | 'compute_units';
    amount: number;
    timestamp: Date;
}

export interface Invoice {
    id: string;
    tenantId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'overdue';
    periodStart: Date;
    periodEnd: Date;
    items: UsageRecord[];
}

export class BillingService {
    private static instance: BillingService;
    private prisma: PrismaClient;
    private usageBuffer: UsageRecord[] = [];

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): BillingService {
        if (!BillingService.instance) {
            BillingService.instance = new BillingService();
        }
        return BillingService.instance;
    }

    /**
     * Tracks usage for a specific tenant.
     * Buffers writes to reduce database load.
     */
    public async trackUsage(tenantId: string, metric: UsageRecord['metric'], amount: number) {
        const record: UsageRecord = {
            tenantId,
            metric,
            amount,
            timestamp: new Date()
        };

        this.usageBuffer.push(record);

        // Simple flush strategy for demo purposes
        if (this.usageBuffer.length >= 100) {
            await this.flushUsage();
        }
    }

    /**
     * Flushes buffered usage records to the database.
     */
    public async flushUsage() {
        if (this.usageBuffer.length === 0) return;

        const recordsToSave = [...this.usageBuffer];
        this.usageBuffer = [];

        console.log(`[BillingService] Flushing ${recordsToSave.length} usage records to DB.`);

        // In a real implementation:
        // await this.prisma.usageRecord.createMany({ data: recordsToSave });
    }

    /**
     * Generates an invoice for a tenant for a given period.
     */
    public async generateInvoice(tenantId: string, start: Date, end: Date): Promise<Invoice> {
        // Mock calculation
        const mockAmount = Math.floor(Math.random() * 1000) + 50;

        const invoice: Invoice = {
            id: `inv-${Date.now()}`,
            tenantId,
            amount: mockAmount,
            currency: 'USD',
            status: 'pending',
            periodStart: start,
            periodEnd: end,
            items: [] // In real app, fetch aggregated items
        };

        console.log(`[BillingService] Generated invoice ${invoice.id} for tenant ${tenantId}: $${invoice.amount}`);
        return invoice;
    }

    /**
     * Retrieves current metrics for a tenant.
     */
    public async getMetrics(tenantId: string): Promise<any> {
        return {
            apiCalls: Math.floor(Math.random() * 10000),
            storageUsed: Math.floor(Math.random() * 500) + 'MB',
            estimatedCost: Math.floor(Math.random() * 100) + ' USD'
        };
    }
}
