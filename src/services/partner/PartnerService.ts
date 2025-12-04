import { prisma } from '../../database/prismaClient';

export class PartnerService {

    /**
     * Create a new Partner
     */
    async createPartner(data: {
        name: string;
        slug: string;
        segment: string;
        type?: string;
        webhookUrl?: string;
        maxAssets?: number;
    }) {
        return prisma.partner.create({
            data: {
                name: data.name,
                slug: data.slug,
                segment: data.segment,
                type: data.type || 'MANUFACTURER',
                webhookUrl: data.webhookUrl,
                maxAssets: data.maxAssets,
                status: 'ACTIVE'
            }
        });
    }

    /**
     * Get Partner by ID
     */
    async getPartnerById(id: string) {
        return prisma.partner.findUnique({
            where: { id }
        });
    }

    /**
     * List Partners
     */
    async listPartners(filter?: { status?: string }) {
        return prisma.partner.findMany({
            where: filter
        });
    }

    /**
     * Suspend Partner
     */
    async suspendPartner(id: string) {
        return prisma.partner.update({
            where: { id },
            data: { status: 'SUSPENDED', isActive: false }
        });
    }
}
