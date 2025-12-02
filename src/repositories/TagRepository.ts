import { PrismaClient, NTAG424Tag, TagVerificationLog, Prisma } from "@prisma/client";
import { getPrismaClient } from "../database";

export class TagRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = getPrismaClient();
    }

    async findById(id: string): Promise<(NTAG424Tag & { partnerAsset: any; linkedSubject: any; incidents: any; config: any }) | null> {
        return this.prisma.nTAG424Tag.findUnique({
            where: { id },
            include: {
                partnerAsset: true,
                linkedSubject: true,
                incidents: true,
                config: true
            }
        });
    }

    async findByUid(uid: string): Promise<NTAG424Tag | null> {
        return this.prisma.nTAG424Tag.findUnique({
            where: { uid }
        });
    }

    async create(data: Prisma.NTAG424TagCreateInput): Promise<NTAG424Tag> {
        return this.prisma.nTAG424Tag.create({
            data,
            include: {
                config: true,
                partnerAsset: true,
                linkedSubject: true
            }
        });
    }

    async update(id: string, data: Prisma.NTAG424TagUpdateInput): Promise<NTAG424Tag> {
        return this.prisma.nTAG424Tag.update({
            where: { id },
            data
        });
    }

    async updateStatus(id: string, status: string): Promise<NTAG424Tag> {
        return this.prisma.nTAG424Tag.update({
            where: { id },
            data: { status }
        });
    }

    async updateCounter(id: string, counter: number): Promise<NTAG424Tag> {
        return this.prisma.nTAG424Tag.update({
            where: { id },
            data: { lastAcceptedCtr: counter }
        });
    }

    async saveVerificationLog(data: Prisma.TagVerificationLogCreateInput): Promise<TagVerificationLog> {
        return this.prisma.tagVerificationLog.create({
            data
        });
    }

    /**
     * Finds all active tags with their configuration.
     * Used for trying to decrypt SDMENC when the tag ID is not known yet.
     * Warning: This can be expensive if there are many tags.
     */
    async findAllActiveWithConfig(): Promise<(NTAG424Tag & { config: any })[]> {
        return this.prisma.nTAG424Tag.findMany({
            where: { status: { in: ['ACTIVE', 'PENDING_ENCODING', 'ENCODED'] } },
            include: { config: true },
        });
    }
}
