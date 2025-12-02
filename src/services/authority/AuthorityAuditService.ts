import { prisma } from '../../database/prismaClient';
import { AuditLogService } from '../audit/AuditLogService';
import crypto from 'crypto';

export class AuthorityAuditService {
    private auditService: AuditLogService;

    constructor() {
        this.auditService = new AuditLogService();
    }

    /**
     * Request audit access for an asset
     */
    async requestAudit(assetId: string, requesterId: string, reason: string) {
        const asset = await prisma.partnerAsset.findUnique({
            where: { id: assetId }
        });

        if (!asset || !asset.ownerId) {
            throw new Error('Asset not found or has no owner.');
        }

        // Create Request
        const request = await prisma.authorityAuditRequest.create({
            data: {
                assetId,
                requesterId,
                ownerId: asset.ownerId,
                reason,
                status: 'PENDING'
            }
        });

        // Log Audit
        await this.auditService.log({
            eventType: 'AUTH_AUDIT_REQUESTED',
            severity: 'INFO',
            actorType: 'API', // Or 'AUTHORITY' if we add that type
            actorId: requesterId,
            assetId,
            payload: { requestId: request.id, reason }
        });

        return request;
    }

    /**
     * Approve audit request
     */
    async approveAudit(requestId: string, ownerId: string) {
        const request = await prisma.authorityAuditRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new Error('Request not found.');
        if (request.ownerId !== ownerId) throw new Error('Unauthorized: You are not the owner.');
        if (request.status !== 'PENDING') throw new Error('Request is not pending.');

        // Generate Token
        const auditToken = crypto.randomBytes(32).toString('hex');
        const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const updatedRequest = await prisma.authorityAuditRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                auditToken,
                validUntil
            }
        });

        await this.auditService.log({
            eventType: 'AUTH_AUDIT_APPROVED',
            severity: 'INFO',
            actorType: 'USER',
            actorId: ownerId,
            assetId: request.assetId,
            payload: { requestId, validUntil }
        });

        return updatedRequest;
    }

    /**
     * Reject audit request
     */
    async rejectAudit(requestId: string, ownerId: string) {
        const request = await prisma.authorityAuditRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new Error('Request not found.');
        if (request.ownerId !== ownerId) throw new Error('Unauthorized: You are not the owner.');
        if (request.status !== 'PENDING') throw new Error('Request is not pending.');

        const updatedRequest = await prisma.authorityAuditRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date()
            }
        });

        await this.auditService.log({
            eventType: 'AUTH_AUDIT_REJECTED',
            severity: 'INFO',
            actorType: 'USER',
            actorId: ownerId,
            assetId: request.assetId,
            payload: { requestId }
        });

        return updatedRequest;
    }

    /**
     * Get deep audit data using token
     */
    async getAuditData(auditToken: string, ipAddress?: string) {
        const request = await prisma.authorityAuditRequest.findUnique({
            where: { auditToken },
            include: {
                asset: {
                    include: {
                        ownershipTransfers: {
                            include: {
                                fromOwner: { select: { id: true } }, // Only IDs
                                toOwner: { select: { id: true } }
                            }
                        },
                        incidents: true,
                        ntag424Tags: {
                            select: {
                                uid: true,
                                status: true,
                                encodedAt: true,
                                verifications: {
                                    take: 50,
                                    orderBy: { createdAt: 'desc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!request) throw new Error('Invalid token.');
        if (!request.validUntil || new Date() > request.validUntil) {
            throw new Error('Token expired.');
        }

        // Log Access
        await this.auditService.log({
            eventType: 'AUTH_AUDIT_ACCESS_GRANTED',
            severity: 'WARNING', // Warning because deep access is granted
            actorType: 'API',
            actorId: request.requesterId,
            assetId: request.assetId,
            payload: { requestId: request.id, ipAddress }
        });

        const asset = request.asset;

        // Construct Deep Data Package (Masking PII)
        return {
            asset: {
                id: asset.id,
                publicId: asset.publicId,
                type: asset.type,
                status: asset.status,
                metadata: asset.metadata, // Authorities see full metadata (except PII if any)
                createdAt: asset.createdAt,
                updatedAt: asset.updatedAt
            },
            ownershipHistory: asset.ownershipTransfers.map(t => ({
                id: t.id,
                fromOwnerId: t.fromOwnerId, // Authorities see internal IDs
                toOwnerId: t.toOwnerId,
                txId: t.txId,
                status: t.status,
                timestamp: t.updatedAt
            })),
            incidents: asset.incidents,
            tags: asset.ntag424Tags.map(tag => ({
                uid: tag.uid, // Authorities see UID
                status: tag.status,
                encodedAt: tag.encodedAt,
                recentVerifications: tag.verifications
            })),
            // Add blockchain anchors if stored separately
        };
    }
}
