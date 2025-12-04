import { Request, Response } from 'express';
import { prisma } from '../database/prismaClient';
import { AuditLogService } from '../services/audit/AuditLogService';
import { PublicAssetService } from '../services/public/PublicAssetService';
import { CategoryTemplateService } from '../services/category/CategoryTemplateService';
import { WebhookDispatcherService } from '../services/webhook/WebhookDispatcherService';

export const registerAsset = async (req: Request, res: Response) => {
    const auditService = new AuditLogService();
    const webhookDispatcher = new WebhookDispatcherService();
    const publicAssetService = new PublicAssetService();
    const categoryService = new CategoryTemplateService();

    try {
        const partner = (req as any).partner;
        let { type, metadata, externalId, categorySlug } = req.body;

        // Validate Category Template (New System)
        if (categorySlug) {
            const validation = await categoryService.validateAssetMetadata(categorySlug, metadata);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            // Use normalized metadata
            metadata = validation.normalized;
        }

        // 3. Create Asset
        const asset = await prisma.partnerAsset.create({
            data: {
                partnerId: partner.id,
                type: type || 'generic', // Default if not provided
                metadata,
                externalId,
                status: 'REGISTERED',
                categorySlug // Link to new CategoryTemplate
            }
        });

        // 4. Ensure Public ID
        const publicId = await publicAssetService.ensurePublicId(asset.id);

        // 5. Audit Log
        await auditService.log({
            eventType: 'PARTNER_ASSET_REGISTERED',
            severity: 'INFO',
            actorType: 'PARTNER',
            actorId: partner.id,
            assetId: asset.id,
            payload: { externalId, categorySlug }
        });

        // 6. Webhook Event
        await webhookDispatcher.queueEvent('asset.created', {
            assetId: asset.id,
            publicId,
            partnerId: partner.id,
            externalId,
            categorySlug,
            createdAt: asset.createdAt
        }, { partnerId: partner.id });

        res.status(201).json(asset);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const listAssets = async (req: Request, res: Response) => {
    try {
        const partner = (req as any).partner;
        const { page = 1, limit = 20 } = req.query;

        const assets = await prisma.partnerAsset.findMany({
            where: { partnerId: partner.id },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            orderBy: { createdAt: 'desc' }
        });

        res.json(assets);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAsset = async (req: Request, res: Response) => {
    const auditService = new AuditLogService();
    try {
        const partner = (req as any).partner;
        const { assetId } = req.params;

        const asset = await prisma.partnerAsset.findFirst({
            where: { id: assetId, partnerId: partner.id },
            include: {
                incidents: {
                    select: { type: true, status: true, incidentDate: true } // No PII
                }
            }
        });

        if (!asset) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        await auditService.log({
            eventType: 'PARTNER_ASSET_VIEWED',
            severity: 'INFO',
            actorType: 'PARTNER',
            actorId: partner.id,
            assetId: asset.id
        });

        res.json(asset);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
