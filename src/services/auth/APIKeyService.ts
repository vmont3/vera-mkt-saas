import { PrismaClient, PartnerApiKey } from '@prisma/client';
import { getPrismaClient } from '../../database';
import crypto from 'crypto';

export interface APIKeyData {
    partnerId: string;
    scopes: string[];
}

export class APIKeyService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    /**
     * Generate a new API Key for a partner
     * Returns the plain text key (only once)
     */
    async generateKey(partnerId: string, name: string, scopes: string[], expiresAt?: Date): Promise<{ apiKey: string; keyId: string }> {
        // Generate random key
        const randomBytes = crypto.randomBytes(32).toString('hex');
        const apiKey = `qc_live_${randomBytes}`;

        // Hash key
        const apiKeyHash = this.hashKey(apiKey);

        // Store in DB
        const keyRecord = await this.prisma.partnerApiKey.create({
            data: {
                partnerId,
                name,
                apiKeyHash,
                scopes,
                active: true,
                expiresAt
            }
        });

        return { apiKey, keyId: keyRecord.id };
    }

    /**
     * Validate an API Key
     */
    async validateKey(apiKey: string): Promise<APIKeyData | null> {
        const apiKeyHash = this.hashKey(apiKey);

        const keyRecord = await this.prisma.partnerApiKey.findUnique({
            where: { apiKeyHash },
            include: { partner: true }
        });

        if (!keyRecord) return null;
        if (!keyRecord.active) return null;
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) return null;
        if (!keyRecord.partner.isActive) return null;

        // Update last used asynchronously
        this.updateLastUsed(keyRecord.id).catch(console.error);

        return {
            partnerId: keyRecord.partnerId,
            scopes: keyRecord.scopes as string[]
        };
    }

    /**
     * Rotate a key (invalidate old, create new)
     */
    async rotateKey(keyId: string, newExpiresAt?: Date): Promise<{ apiKey: string; keyId: string }> {
        const oldKey = await this.prisma.partnerApiKey.findUnique({ where: { id: keyId } });
        if (!oldKey) throw new Error('Key not found');

        // Revoke old key
        await this.revokeKey(keyId);

        // Generate new key with same metadata
        return this.generateKey(oldKey.partnerId, oldKey.name, oldKey.scopes as string[], newExpiresAt);
    }

    /**
     * Revoke a key
     */
    async revokeKey(keyId: string): Promise<PartnerApiKey> {
        return this.prisma.partnerApiKey.update({
            where: { id: keyId },
            data: { active: false }
        });
    }

    /**
     * List keys for a partner
     */
    async listKeys(partnerId: string): Promise<PartnerApiKey[]> {
        return this.prisma.partnerApiKey.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' }
        });
    }

    private hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    private async updateLastUsed(keyId: string) {
        await this.prisma.partnerApiKey.update({
            where: { id: keyId },
            data: { lastUsedAt: new Date() }
        });
    }
}
