import { z } from 'zod';

// --- Enums ---

export enum PartnerSegment {
    RECYCLE = 'recycle',
    BENEFITS = 'benefits',
    MARKETPLACE = 'marketplace',
    OTHER = 'other',
}

export enum AnchoringMode {
    IMMEDIATE = 'immediate',
    ASYNC = 'async',
    BATCH = 'batch',
}

export enum SignatureMode {
    TERMINAL = 'terminal_signature',
    APP = 'app_signature',
    GOVBR = 'govbr_signature',
    NONE = 'none',
}

export enum OwnershipFlow {
    AUTO_TRANSFER = 'auto_transfer',
    REQUIRES_SIGNATURE = 'requires_signature',
    TWO_STEP_REVIEW = 'two_step_review',
}

// --- Configuration Schemas ---

export const PricingRulesSchema = z.object({
    formula: z.string(), // e.g., "(weight * basePrice * purity) + bonusESG"
    basePrices: z.record(z.string(), z.number()), // { "electronic": 5.0, "pet": 0.5 }
    bonusRules: z.record(z.string(), z.number()).optional(), // { "esg_container_90": 0.10 }
});

export const PartnerRulesSchema = z.object({
    requiresUserContract: z.boolean().default(false),
    requiresGovBrIntegration: z.boolean().default(false),
    ownershipFlow: z.nativeEnum(OwnershipFlow).default(OwnershipFlow.AUTO_TRANSFER),
});

export const AnchoringRulesSchema = z.object({
    mode: z.nativeEnum(AnchoringMode).default(AnchoringMode.ASYNC),
    batchSize: z.number().optional(),
    queueName: z.string().optional(),
});

export const SignatureRulesSchema = z.object({
    mode: z.nativeEnum(SignatureMode).default(SignatureMode.NONE),
    provider: z.string().optional(),
});

export const WebhookRulesSchema = z.object({
    url: z.string().url().optional(),
    events: z.array(z.string()).default([]),
    retryPolicy: z.object({
        maxRetries: z.number().default(3),
        backoff: z.number().default(1000),
    }).optional(),
});

export const RiskRulesSchema = z.object({
    maxDivergencePercent: z.number().default(10),
    auditThresholdPercent: z.number().default(30),
});

export const AssetSchemaConfigSchema = z.object({
    allowedTypes: z.array(z.string()),
    requiredFields: z.array(z.string()),
    validation: z.record(z.string(), z.any()).optional(),
});

export const PartnerConfigSchema = z.object({
    assetSchema: AssetSchemaConfigSchema,
    lifecycle: z.array(z.string()), // Ordered list of statuses
    partnerRules: PartnerRulesSchema,
    pricingRules: PricingRulesSchema.optional(),
    anchoringRules: AnchoringRulesSchema,
    signatureRules: SignatureRulesSchema,
    webhookRules: WebhookRulesSchema.optional(),
    riskRules: RiskRulesSchema.optional(),
});

export type PartnerConfig = z.infer<typeof PartnerConfigSchema>;

// --- API Request Schemas ---

export const CreatePartnerSchema = z.object({
    name: z.string(),
    slug: z.string(),
    segment: z.nativeEnum(PartnerSegment),
    config: PartnerConfigSchema,
});

export const RegisterAssetSchema = z.object({
    type: z.string(),
    externalId: z.string().optional(),
    ownerId: z.string().optional(),
    metadata: z.record(z.string(), z.any()), // weight, photo, etc.
});

export const UpdateAssetSchema = z.object({
    status: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

export const ReviewAssetSchema = z.object({
    decision: z.enum(['APPROVED', 'REJECTED', 'AUDIT']),
    notes: z.string().optional(),
    metadataUpdates: z.record(z.string(), z.any()).optional(),
});

export const SignatureCallbackSchema = z.object({
    signerId: z.string(),
    signatureData: z.record(z.string(), z.any()),
});
