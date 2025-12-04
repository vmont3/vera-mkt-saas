import { IncidentRepository } from '../../repositories/IncidentRepository';
import { getPrismaClient } from '../../database';
import { AuditLogService } from '../audit/AuditLogService';
import { WebhookDispatcherService } from '../webhook/WebhookDispatcherService';

export class IncidentService {
    private repository: IncidentRepository;

    constructor(repository?: IncidentRepository) {
        this.repository = repository || new IncidentRepository();
    }

    /**
     * Create user-reported incident
     */
    async createIncident(params: {
        tagId?: string;
        subjectId?: string;
        partnerAssetId?: string;
        type: string; // FURTO, ROUBO, PERDA, ACHADO, etc.
        description: string;
        reportedBy?: string;
        incidentDate: Date;
        attachments?: any;
    }) {
        const incident = await this.repository.create({
            tag: params.tagId ? { connect: { id: params.tagId } } : undefined,
            subject: params.subjectId ? { connect: { id: params.subjectId } } : undefined,
            partnerAsset: params.partnerAssetId ? { connect: { id: params.partnerAssetId } } : undefined,
            type: params.type,
            description: params.description,
            reporter: params.reportedBy ? { connect: { id: params.reportedBy } } : undefined,
            originType: 'USER',
            status: 'PENDING_APPROVAL',
            incidentDate: params.incidentDate,
            attachments: params.attachments,
        });

        // Audit Log
        const auditService = new AuditLogService();
        await auditService.log({
            eventType: 'INCIDENT_REPORTED',
            severity: 'WARNING',
            actorType: 'USER',
            actorId: params.reportedBy || 'ANONYMOUS',
            assetId: incident.id,
            payload: {
                type: params.type,
                description: params.description,
                origin: 'USER'
            }
        });

        // Webhook Event
        const webhookDispatcher = new WebhookDispatcherService();
        if (incident.partnerAssetId) {
            // Fetch partnerId from PartnerAsset
            const prisma = getPrismaClient();
            const partnerAsset = await prisma.partnerAsset.findUnique({
                where: { id: incident.partnerAssetId },
                select: { partnerId: true }
            });

            const partnerId = partnerAsset ? partnerAsset.partnerId : undefined;

            await webhookDispatcher.queueEvent('incident.opened', {
                incidentId: incident.id,
                assetId: incident.partnerAssetId,
                type: incident.type,
                description: incident.description,
                status: incident.status,
                createdAt: incident.createdAt
            }, { partnerId });
        }

        return incident;
    }

    /**
     * Create authority/delegated incident with audit trail
     */
    async createAuthorityIncident(params: {
        tagId?: string;
        subjectId?: string;
        partnerAssetId?: string;
        type: string;
        description: string;
        reportedBy?: string;
        incidentDate: Date;
        // Audit fields
        authorityOrg: string;
        authorityId: string;
        officialProtocol?: string;
        externalRefs?: any;
        notes?: string;
        auditAttachments?: any;
        ipAddress?: string;
    }) {
        // Create incident
        const incident = await this.repository.create({
            tag: params.tagId ? { connect: { id: params.tagId } } : undefined,
            subject: params.subjectId ? { connect: { id: params.subjectId } } : undefined,
            partnerAsset: params.partnerAssetId ? { connect: { id: params.partnerAssetId } } : undefined,
            type: params.type,
            description: params.description,
            reporter: params.reportedBy ? { connect: { id: params.reportedBy } } : undefined,
            originType: 'AUTHORITY',
            status: 'PENDING_APPROVAL',
            incidentDate: params.incidentDate,
        });

        // Create audit record
        await this.repository.addAuditRecord({
            incident: { connect: { id: incident.id } },
            authorityOrg: params.authorityOrg,
            authorityId: params.authorityId,
            officialProtocol: params.officialProtocol,
            externalRefs: params.externalRefs,
            submitter: params.reportedBy ? { connect: { id: params.reportedBy } } : undefined,
            notes: params.notes,
            attachments: params.auditAttachments,
            ipAddress: params.ipAddress,
        });

        // Audit Log
        const auditService = new AuditLogService();
        await auditService.log({
            eventType: 'INCIDENT_REPORTED',
            severity: 'WARNING',
            actorType: 'USER', // Authority user
            actorId: params.reportedBy || 'AUTHORITY',
            assetId: incident.id,
            payload: {
                type: params.type,
                description: params.description,
                origin: 'AUTHORITY',
                authorityOrg: params.authorityOrg
            }
        });

        // Webhook Event
        const webhookDispatcher = new WebhookDispatcherService();
        if (incident.partnerAssetId) {
            // Fetch partnerId from PartnerAsset
            const prisma = getPrismaClient();
            const partnerAsset = await prisma.partnerAsset.findUnique({
                where: { id: incident.partnerAssetId },
                select: { partnerId: true }
            });

            const partnerId = partnerAsset ? partnerAsset.partnerId : undefined;

            await webhookDispatcher.queueEvent('incident.opened', {
                incidentId: incident.id,
                assetId: incident.partnerAssetId,
                type: incident.type,
                description: incident.description,
                status: incident.status,
                createdAt: incident.createdAt
            }, { partnerId });
        }

        return incident;
    }

    /**
     * Approve incident (owner action)
     */
    async approveIncident(incidentId: string, ownerId: string, reviewNotes?: string) {
        // Verify ownership
        const incident = await this.repository.findById(incidentId);

        if (!incident || incident.ownerId !== ownerId) {
            throw new Error('Incident not found or you are not the owner');
        }

        const updated = await this.repository.updateStatus(incidentId, 'APPROVED', reviewNotes);

        // Audit Log
        const auditService = new AuditLogService();
        await auditService.log({
            eventType: 'INCIDENT_APPROVED',
            severity: 'INFO',
            actorType: 'USER',
            actorId: ownerId,
            assetId: incidentId,
            payload: { reviewNotes }
        });

        // Webhook Event
        const webhookDispatcher = new WebhookDispatcherService();
        if (incident.partnerAssetId) {
            // Fetch partnerId
            const prisma = getPrismaClient();
            const partnerAsset = await prisma.partnerAsset.findUnique({
                where: { id: incident.partnerAssetId },
                select: { partnerId: true }
            });
            const partnerId = partnerAsset ? partnerAsset.partnerId : undefined;

            await webhookDispatcher.queueEvent('incident.resolved', {
                incidentId: incident.id,
                assetId: incident.partnerAssetId,
                status: 'APPROVED',
                resolutionNotes: reviewNotes,
                resolvedAt: new Date()
            }, { partnerId });
        }

        return updated;
    }

    /**
     * Reject incident (owner action)
     */
    async rejectIncident(incidentId: string, ownerId: string, reviewNotes: string) {
        const incident = await this.repository.findById(incidentId);

        if (!incident || incident.ownerId !== ownerId) {
            throw new Error('Incident not found or you are not the owner');
        }

        const updated = await this.repository.updateStatus(incidentId, 'REJECTED', reviewNotes);

        // Audit Log
        const auditService = new AuditLogService();
        await auditService.log({
            eventType: 'INCIDENT_REJECTED',
            severity: 'INFO',
            actorType: 'USER',
            actorId: ownerId,
            assetId: incidentId,
            payload: { reviewNotes }
        });

        return updated;
    }

    /**
     * Get public incident summary for tag
     */
    async getPublicIncidentSummary(tagId: string): Promise<string> {
        const incidents = await this.repository.findByTagId(tagId, 'APPROVED');

        if (incidents.length === 0) {
            return 'Sem ocorrências';
        }

        const counts: Record<string, number> = {};
        incidents.forEach((inc) => {
            counts[inc.type] = (counts[inc.type] || 0) + 1;
        });

        const summary = Object.entries(counts)
            .map(([type, count]) => `${count} ${type}`)
            .join(', ');

        return summary;
    }

    /**
     * Process offline incident event
     */
    async processOfflineIncident(payload: any) {
        if (payload.incidentDate) {
            payload.incidentDate = new Date(payload.incidentDate);
        }
        await this.createIncident(payload);
    }

    /**
     * List pending incidents for authority review
     */
    async listPendingIncidents(authorityId: string) {
        return this.repository.findPending();
    }
}
