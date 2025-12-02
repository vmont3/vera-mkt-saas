import { prisma } from '../../../database/prismaClient';
import { EventService } from './event.service';
import { RegisterAssetSchema, UpdateAssetSchema, ReviewAssetSchema, PartnerConfig } from '../types/partner.types';

const eventService = new EventService();

export class AssetService {
    async register(partnerId: string, data: any, config?: PartnerConfig) {
        const parsed = RegisterAssetSchema.parse(data);

        // Validate against partner config (allowedTypes)
        if (config?.assetSchema?.allowedTypes && !config.assetSchema.allowedTypes.includes(parsed.type)) {
            throw new Error(`Asset type '${parsed.type}' not allowed by partner configuration.`);
        }

        const asset = await prisma.partnerAsset.create({
            data: {
                partnerId,
                type: parsed.type,
                externalId: parsed.externalId,
                ownerId: parsed.ownerId,
                metadata: parsed.metadata,
                status: 'PENDING_REVIEW', // Initial status, could be dynamic based on config.lifecycle[0]
            },
        });

        await eventService.emit(partnerId, 'onAssetRegistered', { assetId: asset.id }, asset.id);
        return asset;
    }

    async update(partnerId: string, assetId: string, data: any) {
        const parsed = UpdateAssetSchema.parse(data);

        const asset = await prisma.partnerAsset.update({
            where: { id: assetId, partnerId },
            data: {
                status: parsed.status ?? undefined,
                metadata: parsed.metadata ?? undefined,
            },
        });

        await eventService.emit(partnerId, 'onAssetUpdated', { assetId: asset.id, updates: parsed }, asset.id);
        return asset;
    }

    async review(partnerId: string, assetId: string, data: any, config?: PartnerConfig) {
        const parsed = ReviewAssetSchema.parse(data);

        // Logic for e-recycle pricing calculation could go here or be triggered by status change
        let metadataUpdates = parsed.metadataUpdates || {};

        // Example: Calculate price if status is APPROVED and pricing rules exist
        if (parsed.decision === 'APPROVED' && config?.pricingRules) {
            // This is where we would implement the dynamic formula evaluator
            // For now, we'll hardcode the e-recycle logic as requested for the MVP
            // Formula: (weight * basePrice * purity) + bonusESG

            const asset = await prisma.partnerAsset.findUnique({ where: { id: assetId } });
            if (asset) {
                const meta = asset.metadata as any;
                const weight = Number(meta.weight || 0);
                const purity = Number(meta.purity || 1.0); // Default 1.0
                const type = asset.type;

                const basePrice = config.pricingRules.basePrices[type] || 0;
                const bonusRules = config.pricingRules.bonusRules || {};

                let bonus = 0;
                // Example bonus rule: "esg_container_90" -> if container > 90%
                // We assume metadata has containerFillLevel
                if (meta.containerFillLevel && meta.containerFillLevel > 90 && bonusRules['esg_container_90']) {
                    bonus = bonusRules['esg_container_90'];
                }

                const calculatedPrice = (weight * basePrice * purity) + (weight * bonus);

                metadataUpdates = {
                    ...metadataUpdates,
                    calculatedPrice,
                    pricingDetails: {
                        weight, basePrice, purity, bonus, formula: config.pricingRules.formula
                    }
                };
            }
        }

        const asset = await prisma.partnerAsset.update({
            where: { id: assetId, partnerId },
            data: {
                status: parsed.decision, // e.g. APPROVED, REJECTED
                metadata: Object.keys(metadataUpdates).length > 0 ? { ...(await prisma.partnerAsset.findUnique({ where: { id: assetId } }))?.metadata as object, ...metadataUpdates } : undefined,
            },
        });

        await eventService.emit(partnerId, 'onAssetReviewed', { assetId: asset.id, decision: parsed.decision }, asset.id);
        return asset;
    }

    async list(partnerId: string) {
        return prisma.partnerAsset.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
