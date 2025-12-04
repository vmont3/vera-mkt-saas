import { prisma } from '../../../database/prismaClient';
import { PartnerConfigSchema, PartnerConfig } from '../types/partner.types';
import { AssetService } from './asset.service';
import { SignatureService } from './signature.service';
import { BatchService } from './batch.service';
import { EventService } from './event.service';

const assetService = new AssetService();
const signatureService = new SignatureService();
const batchService = new BatchService();
const eventService = new EventService();

export class PartnerService {
    // Partner CRUD
    async createPartner(data: any) {
        const parsedConfig = PartnerConfigSchema.parse(data.config);
        const partner = await prisma.partner.create({
            data: {
                name: data.name,
                slug: data.slug,
                segment: data.segment,
                config: {
                    create: { config: parsedConfig },
                },
            },
            include: { config: true },
        });
        return partner;
    }

    // Helper to get partner and config
    private async getPartnerContext(slug: string) {
        const partner = await prisma.partner.findUnique({
            where: { slug },
            include: { config: true }
        });
        if (!partner) throw new Error('Partner not found');

        const config = partner.config?.config as unknown as PartnerConfig;
        return { partner, config };
    }

    // Asset operations
    async registerAsset(partnerSlug: string, data: any) {
        const { partner, config } = await this.getPartnerContext(partnerSlug);
        return assetService.register(partner.id, data, config);
    }

    async updateAsset(partnerSlug: string, assetId: string, data: any) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return assetService.update(partner.id, assetId, data);
    }

    async reviewAsset(partnerSlug: string, assetId: string, data: any) {
        const { partner, config } = await this.getPartnerContext(partnerSlug);
        return assetService.review(partner.id, assetId, data, config);
    }

    // Signature flow
    async requestSignature(partnerSlug: string, assetId: string, data: any) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return signatureService.requestSignature(partner.id, assetId, data.type, data.signatureData);
    }

    async signatureCallback(partnerSlug: string, signatureId: string, data: any) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return signatureService.processCallback(partner.id, signatureId, data);
    }

    // Batch operations
    async createBatch(partnerSlug: string, data: any) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return batchService.createBatch(partner.id, data.type, data.itemCount);
    }

    async anchorBatch(partnerSlug: string, batchId: string) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return batchService.anchorBatch(partner.id, batchId);
    }

    // Listing
    async listAssets(partnerSlug: string) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return assetService.list(partner.id);
    }

    async listBatches(partnerSlug: string) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return batchService.listBatches(partner.id);
    }

    async listEvents(partnerSlug: string) {
        const { partner } = await this.getPartnerContext(partnerSlug);
        return eventService.listEvents(partner.id);
    }
}
