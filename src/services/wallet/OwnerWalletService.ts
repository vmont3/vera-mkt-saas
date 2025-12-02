import { prisma } from '../../database/prismaClient';

export class OwnerWalletService {
    /**
     * Get list of assets owned by the user (List View)
     */
    async getMyAssets(ownerId: string) {
        const assets = await prisma.partnerAsset.findMany({
            where: { ownerId },
            include: {
                category: true,
                categoryTemplate: true, // New relation
                incidents: {
                    select: { status: true }
                },
                // Assuming we can link to anchor info via PartnerBatch or directly if added
                batch: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        return assets.map(asset => {
            const openIncidents = asset.incidents.filter(i => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length;
            const closedIncidents = asset.incidents.length - openIncidents;

            // Extract metadata safely
            const meta = asset.metadata as any || {};

            return {
                assetId: asset.id,
                publicId: asset.publicId || 'PENDING',
                categorySlug: asset.categoryTemplate?.slug || asset.category?.slug || 'unknown',
                category: asset.categoryTemplate ? {
                    slug: asset.categoryTemplate.slug,
                    displayName: asset.categoryTemplate.displayName,
                    iconUrl: asset.categoryTemplate.iconUrl,
                    uiSchema: asset.categoryTemplate.uiSchema
                } : null,
                displayName: meta.name || asset.type, // Fallback
                thumbnailUrl: meta.image || meta.thumbnail || null,
                status: asset.status,
                lastVerificationAt: asset.updatedAt, // Approximation if we don't have explicit verification log link here easily
                incidentSummary: {
                    open: openIncidents,
                    closed: closedIncidents
                },
                lastAnchor: asset.batch?.anchoredHash ? {
                    txId: asset.batch.blockchainTxId,
                    network: 'algorand', // Hardcoded for now or fetch from config
                    timestamp: asset.batch.anchoredAt
                } : null
            };
        });
    }

    /**
     * Get detailed view of a specific asset
     */
    async getAssetDetailForOwner(ownerId: string, assetId: string) {
        const asset = await prisma.partnerAsset.findFirst({
            where: { id: assetId, ownerId },
            include: {
                category: true,
                ntag424Tags: {
                    select: {
                        id: true,
                        status: true,
                        encodedAt: true,
                        uid: true // We will mask this
                    }
                },
                incidents: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                ownershipTransfers: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: {
                        fromOwner: { select: { email: true } },
                        toOwner: { select: { email: true } }
                    }
                },
                batch: true
            }
        });

        if (!asset) return null;

        const meta = asset.metadata as any || {};
        const tag = asset.ntag424Tags[0]; // Assuming 1 tag per asset for now

        return {
            assetId: asset.id,
            publicId: asset.publicId,
            categorySlug: asset.category?.slug,
            metadata: {
                // Whitelist fields to avoid leaking internal data
                name: meta.name,
                description: meta.description,
                image: meta.image,
                attributes: meta.attributes,
                ...meta // Or just return meta if we trust it doesn't have PII
            },
            tagInfo: tag ? {
                encoded: tag.status === 'ENCODED' || tag.status === 'ACTIVE',
                uidMasked: tag.uid ? `****${tag.uid.slice(-4)}` : null,
                encodedAt: tag.encodedAt
            } : null,
            incidents: asset.incidents.map(i => ({
                id: i.id,
                type: i.type,
                status: i.status,
                timestamp: i.createdAt
            })),
            anchors: asset.batch?.anchoredHash ? [{
                txId: asset.batch.blockchainTxId,
                network: 'algorand',
                timestamp: asset.batch.anchoredAt
            }] : [],
            ownershipHistory: asset.ownershipTransfers.map(t => ({
                id: t.id,
                from: this.maskEmail(t.fromOwner?.email),
                to: this.maskEmail(t.toOwner?.email),
                status: t.status,
                date: t.updatedAt
            }))
        };
    }

    /**
     * Get all incidents for the owner
     */
    async getMyIncidents(ownerId: string) {
        const incidents = await prisma.incident.findMany({
            where: { ownerId },
            include: {
                partnerAsset: {
                    select: {
                        id: true,
                        type: true,
                        metadata: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return incidents.map(i => ({
            id: i.id,
            assetId: i.partnerAssetId,
            assetName: (i.partnerAsset?.metadata as any)?.name || i.partnerAsset?.type,
            type: i.type,
            description: i.description,
            status: i.status,
            createdAt: i.createdAt
        }));
    }

    /**
     * Get pending transfers (incoming)
     */
    async getMyPendingTransfers(ownerId: string) {
        const transfers = await prisma.ownershipTransfer.findMany({
            where: {
                toOwnerId: ownerId,
                status: 'PENDING'
            },
            include: {
                asset: {
                    include: { category: true }
                },
                fromOwner: {
                    select: { email: true }
                }
            }
        });

        return transfers.map(t => ({
            transferId: t.id,
            asset: {
                id: t.asset.id,
                name: (t.asset.metadata as any)?.name || t.asset.type,
                category: t.asset.category?.slug
            },
            from: this.maskEmail(t.fromOwner.email),
            initiatedAt: t.createdAt
        }));
    }

    /**
     * Get pending authority audits
     */
    async getMyPendingAuthorityAudits(ownerId: string) {
        const audits = await prisma.authorityAuditRequest.findMany({
            where: {
                ownerId,
                status: 'PENDING'
            },
            include: {
                asset: true,
                requester: { select: { email: true } } // Assuming requester is a User (Authority)
            }
        });

        return audits.map(a => ({
            auditId: a.id,
            asset: {
                id: a.asset.id,
                name: (a.asset.metadata as any)?.name || a.asset.type
            },
            requester: this.maskEmail(a.requester.email), // Or use organization name if available
            reason: a.reason,
            requestedAt: a.createdAt
        }));
    }

    private maskEmail(email?: string): string {
        if (!email) return 'Unknown';
        const [user, domain] = email.split('@');
        return `${user.substring(0, 2)}***@${domain}`;
    }
}
