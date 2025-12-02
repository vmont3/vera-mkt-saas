import { prisma } from '../../database/prismaClient';
import crypto from 'crypto';
import { PublicAssetDTO, PublicOwnerHistoryDTO, PublicIncidentDTO, PublicAnchorDTO } from '../../dtos/PublicAssetDTO';
import { AuditLogService } from '../audit/AuditLogService';
import { publicCache } from '../../utils/cache';

export class PublicAssetService {
    private auditService: AuditLogService;

    constructor() {
        this.auditService = new AuditLogService();
    }

    /**
     * Get public asset details by Public ID (Verun-ready)
     * Implements Caching (20s TTL) and Audit Logging
     */
    async getPublicAsset(publicId: string, ipAddress?: string): Promise<PublicAssetDTO | null> {
        // 1. Check Cache
        const cacheKey = `public_asset:${publicId}`;
        const cached = publicCache.get<PublicAssetDTO>(cacheKey);
        if (cached) {
            return cached;
        }

        // 2. Fetch from DB
        const asset = await prisma.partnerAsset.findUnique({
            where: { publicId },
            include: {
                ownershipTransfers: {
                    where: { status: 'ACCEPTED' },
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        fromOwner: { select: { id: true } },
                        toOwner: { select: { id: true } }
                    }
                },
                incidents: {
                    select: {
                        type: true,
                        status: true,
                        incidentDate: true,
                    }
                },
                template: true, // Include template for filtering (Legacy)
                categoryTemplate: true // New Category Template
            }
        });

        if (!asset) return null;

        // 3. Transform to DTO (Strict Masking)
        const dto: PublicAssetDTO = {
            publicId: asset.publicId!,
            type: asset.type,
            status: asset.status,
            metadata: this.sanitizeMetadata(asset.metadata, asset.template),
            category: asset.categoryTemplate ? {
                slug: asset.categoryTemplate.slug,
                displayName: asset.categoryTemplate.displayName,
                iconUrl: asset.categoryTemplate.iconUrl || undefined,
                uiSchema: asset.categoryTemplate.uiSchema
            } : undefined,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,

            // Anonymized History
            history: this.maskOwnerHistory(asset.ownershipTransfers),

            // Incident Summary
            incidents: asset.incidents.map(i => ({
                type: i.type,
                status: i.status,
                date: i.incidentDate
            })),

            // Blockchain Anchors (Derived from transfers for now)
            anchors: asset.ownershipTransfers
                .filter(t => t.txId)
                .map(t => ({
                    txId: t.txId!,
                    network: 'algorand-testnet', // Should come from DB if stored
                    timestamp: t.updatedAt
                }))
        };

        // 4. Audit Log (Async)
        this.auditService.log({
            eventType: 'PUBLIC_ASSET_LOOKUP',
            severity: 'INFO',
            actorType: 'PUBLIC',
            actorId: ipAddress || 'UNKNOWN',
            assetId: asset.id, // Log internal ID for traceability
            payload: { publicId }
        }).catch(console.error);

        // 5. Cache Result
        publicCache.set(cacheKey, dto, 20); // 20 seconds TTL

        return dto;
    }

    /**
     * Mask owner history to prevent user enumeration
     */
    private maskOwnerHistory(transfers: any[]): PublicOwnerHistoryDTO[] {
        return transfers.map(t => ({
            event: 'OWNERSHIP_TRANSFER',
            timestamp: t.updatedAt,
            blockchainTxId: t.txId,
            fromOwnerMasked: this.maskUserId(t.fromOwnerId),
            toOwnerMasked: this.maskUserId(t.toOwnerId)
        }));
    }

    /**
     * Mask a User ID (e.g., "owner_a1b2c")
     * Uses a consistent hash so the same user looks the same within the history,
     * but cannot be reversed to the real UUID.
     */
    private maskUserId(userId: string): string {
        if (!userId) return 'owner_unknown';
        const hash = crypto.createHash('sha256').update(userId).digest('hex');
        return `owner_${hash.substring(0, 8)}`;
    }

    /**
     * Generate or retrieve a Public ID for an asset
     */
    async ensurePublicId(assetId: string): Promise<string> {
        const asset = await prisma.partnerAsset.findUnique({
            where: { id: assetId }
        });

        if (!asset) throw new Error('Asset not found');
        if (asset.publicId) return asset.publicId;

        // Generate a stable, safe Public ID
        const publicId = 'pub_' + crypto.randomBytes(12).toString('hex');

        await prisma.partnerAsset.update({
            where: { id: assetId },
            data: { publicId }
        });

        return publicId;
    }

    /**
     * Sanitize metadata to remove sensitive fields
     */
    private sanitizeMetadata(metadata: any, template?: any): any {
        if (!metadata || typeof metadata !== 'object') return metadata;

        const clean: any = {};

        // If template exists, use it as an allowlist
        if (template && template.schema && typeof template.schema === 'object' && (template.schema as any).fields) {
            const fields = (template.schema as any).fields;
            for (const field of fields) {
                if (field.public === true && metadata[field.name] !== undefined) {
                    clean[field.name] = metadata[field.name];
                }
            }
            return clean;
        }

        // Fallback: Blacklist approach for legacy assets
        const sensitiveKeys = ['price', 'cost', 'supplier', 'internal_code', 'notes', 'invoice'];

        for (const key in metadata) {
            if (!sensitiveKeys.includes(key.toLowerCase())) {
                clean[key] = metadata[key];
            }
        }
        return clean;
    }
}
