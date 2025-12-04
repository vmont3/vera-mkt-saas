import { prisma } from '../src/database/prismaClient';
import { PartnerConfig, OwnershipFlow, AnchoringMode, SignatureMode } from '../src/modules/partners/types/partner.types';
import * as crypto from 'crypto';

async function main() {
    console.log('Seeding e-recycle partner...');

    const eRecycleConfig: PartnerConfig = {
        assetSchema: {
            allowedTypes: ['electronic', 'glass', 'aluminum', 'pet'],
            requiredFields: ['weight', 'photo'],
            validation: {
                electronic: { requiresSerial: true },
            },
        },
        lifecycle: [
            'discardStarted',
            'discardWeighed',
            'qrGenerated',
            'collected',
            'triaged',
            'approved',
            'signatureRequested',
            'signatureCompleted',
            'readyForPayment',
            'anchored',
            'paid',
        ],
        partnerRules: {
            requiresUserContract: true,
            requiresGovBrIntegration: true,
            ownershipFlow: OwnershipFlow.TWO_STEP_REVIEW,
        },
        pricingRules: {
            formula: '(weight * basePrice * purity) + bonusESG',
            basePrices: {
                electronic: 5.0,
                pet: 0.50,
                glass: 0.30,
                aluminum: 3.00,
            },
            bonusRules: {
                esg_container_90: 0.10,
            },
        },
        anchoringRules: {
            mode: AnchoringMode.ASYNC,
            batchSize: 50,
            queueName: 'erecycle-anchoring',
        },
        signatureRules: {
            mode: SignatureMode.TERMINAL,
            provider: 'internal',
        },
        webhookRules: {
            url: 'https://api.e-recycle.com/webhooks/qc',
            events: ['onAssetRegistered', 'onOwnershipTransferred', 'onBatchAnchored'],
            retryPolicy: {
                maxRetries: 3,
                backoff: 1000,
            },
        },
        riskRules: {
            maxDivergencePercent: 10,
            auditThresholdPercent: 30,
        },
    };

    // Check if exists
    let partner = await prisma.partner.findUnique({
        where: { slug: 'e-recycle' },
    });

    if (!partner) {
        partner = await prisma.partner.create({
            data: {
                name: 'e-recycle',
                slug: 'e-recycle',
                segment: 'recycle',
                config: {
                    create: {
                        config: eRecycleConfig as any,
                    },
                },
            },
        });
        console.log(`Created partner: ${partner.name} (${partner.id})`);
    } else {
        console.log(`Partner e-recycle already exists (${partner.id})`);
        // Update config
        await prisma.partnerConfig.update({
            where: { partnerId: partner.id },
            data: { config: eRecycleConfig as any },
        });
        console.log('Updated config.');
    }

    // Create API Key
    const apiKey = 'sk_erecycle_' + crypto.randomBytes(16).toString('hex');

    const existingKey = await prisma.partnerApiKey.findFirst({
        where: { partnerId: partner.id },
    });

    if (!existingKey) {
        await prisma.partnerApiKey.create({
            data: {
                partnerId: partner.id,
                keyHash: apiKey,
                scopes: ['read', 'write', 'admin'],
                rateLimitPerMinute: 1000,
            },
        });
        console.log(`\n>>> GENERATED API KEY: ${apiKey} <<<\n`);
        console.log('Use this key in x-partner-api-key header.');
    } else {
        console.log(`\n>>> EXISTING API KEY (HASH): ${existingKey.keyHash} <<<\n`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
