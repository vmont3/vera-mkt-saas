import { PrismaClient, Incident, IncidentAudit, Prisma } from "@prisma/client";
import { getPrismaClient } from "../database";

export class IncidentRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async create(data: Prisma.IncidentCreateInput): Promise<Incident> {
        return this.prisma.incident.create({
            data
        });
    }

    async findById(id: string): Promise<(Incident & { auditRecords: IncidentAudit[]; tag: any; subject: any }) | null> {
        return this.prisma.incident.findUnique({
            where: { id },
            include: {
                auditRecords: true,
                tag: true,
                subject: true
            }
        });
    }

    async findByTagId(tagId: string, status?: string): Promise<Incident[]> {
        const where: Prisma.IncidentWhereInput = { tagId };
        if (status) {
            where.status = status;
        }
        return this.prisma.incident.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    async findByOwnerId(ownerId: string, status?: string): Promise<Incident[]> {
        const where: Prisma.IncidentWhereInput = { ownerId };
        if (status) {
            where.status = status;
        }
        return this.prisma.incident.findMany({
            where,
            include: {
                auditRecords: true,
                tag: true,
                subject: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateStatus(id: string, status: string, reviewNotes?: string): Promise<Incident> {
        return this.prisma.incident.update({
            where: { id },
            data: {
                status,
                reviewedAt: new Date(),
                reviewNotes
            }
        });
    }

    async addAuditRecord(data: Prisma.IncidentAuditCreateInput): Promise<IncidentAudit> {
        return this.prisma.incidentAudit.create({
            data
        });
    }
    async findPending(): Promise<Incident[]> {
        return this.prisma.incident.findMany({
            where: { status: 'PENDING_APPROVAL' },
            orderBy: { createdAt: 'desc' },
            include: {
                tag: true,
                subject: true,
                partnerAsset: true
            }
        });
    }
}
