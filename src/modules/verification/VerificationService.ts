import { TagRegistryService, PublicAssetData } from "../../services/tag-registry/TagRegistryService";
import { CryptoUtils } from "../../utils/CryptoUtils";
import { AwsKmsClient, createAwsKmsClient } from "../tag-encoding/infra/AwsKmsClient";

export class VerificationService {
    private tagRegistry: TagRegistryService;
    private kms: AwsKmsClient;

    constructor(tagRegistry?: TagRegistryService, kms?: AwsKmsClient) {
        this.tagRegistry = tagRegistry || new TagRegistryService();
        // In production, these should come from environment variables
        this.kms = kms || createAwsKmsClient(
            process.env.KMS_MASTER_KEY_ID || "mock-key-id",
            process.env.AWS_REGION || "us-east-1"
        );
    }

    /**
     * Verifica uma tag NTAG 424 DNA
     * 
     * @param params Parâmetros extraídos da URL (d=enc, m=mac, r=ctr, uid=uid_mirror)
     */
    async verifyTag(params: { d: string; m: string; r?: string; uid?: string }): Promise<PublicAssetData> {
        const { metrics } = await import("../../utils/metrics");
        metrics.verify_attempt_total.inc();

        const { d, m, r, uid } = params;

        try {
            if (!d || !m) {
                throw new Error("Parâmetros inválidos: 'd' (enc) e 'm' (mac) são obrigatórios.");
            }

            if (!uid) {
                throw new Error("UID é necessário para verificação (deve estar espelhado na URL).");
            }
            if (!r) {
                throw new Error("CTR (r) é necessário para verificação (deve estar espelhado na URL).");
            }

            const uidBytes = Buffer.from(uid, 'hex');
            const ctrBytes = Buffer.from(r, 'hex');
            const encBytes = Buffer.from(d, 'hex');
            const macBytes = Buffer.from(m, 'hex');

            // 1. Obter K_SDM
            const kSdm = await this.kms.getSdmKey();

            // 2. Derivar Chave de Sessão (K_SES)
            const kSes = await CryptoUtils.deriveSessionKey(Buffer.from(kSdm), uidBytes, ctrBytes);

            // 3. Validar MAC (SDMMAC) - Skipped for now per instructions, focusing on decryption

            // 4. Decriptar SDMENC (d)
            const iv = Buffer.alloc(16, 0);
            const decrypted = CryptoUtils.decryptAesCtr(Buffer.from(kSes), iv, encBytes);

            // 5. Extrair dados do payload decriptado
            const realUid = decrypted.subarray(0, 7).toString('hex');
            const realCtr = decrypted.subarray(7, 10);
            const hashTruncated = decrypted.subarray(10, 26).toString('hex');
            const tagInternalIdBytes = decrypted.subarray(26, 62);
            const tagInternalId = tagInternalIdBytes.toString('utf-8');

            // 6. Validar Anti-replay e Integridade
            const ctrValue = (realCtr[2] << 16) | (realCtr[1] << 8) | realCtr[0];

            // 7. Consultar Registry
            const assetData = await this.tagRegistry.resolveAssetForTag(hashTruncated, tagInternalId);

            // Validar CTR e Hash no Registry/DB
            const tag = await this.tagRegistry.findByTagInternalId(tagInternalId);

            if (tag) {
                // A. Replay Protection
                if (ctrValue <= tag.lastAcceptedCtr) {
                    await this.handleSuspiciousActivity(tagInternalId, 'SDM_CTR_REPLAY_DETECTED', {
                        ctrValue,
                        lastAcceptedCtr: tag.lastAcceptedCtr,
                        uid
                    });
                    throw new Error("Replay detectado! Contador inválido.");
                }

                // B. Hash Integrity Check (Constant Time)
                const storedHashBuffer = Buffer.from(tag.hashTruncated, 'hex');
                const receivedHashBuffer = Buffer.from(hashTruncated, 'hex');

                if (!CryptoUtils.constantTimeEqual(storedHashBuffer, receivedHashBuffer)) {
                    await this.handleSuspiciousActivity(tagInternalId, 'TAG_HASH_MISMATCH', {
                        receivedHash: hashTruncated,
                        storedHash: tag.hashTruncated
                    });
                    throw new Error("Integridade da tag comprometida (Hash Mismatch).");
                }

                // Atualizar contador no banco
                await this.updateAcceptedCounter(tagInternalId, ctrValue);
            } else {
                // Tag ID in payload but not in DB? Critical consistency issue or fake tag
                const { AuditLogService } = await import('../../services/audit/AuditLogService');
                const auditService = new AuditLogService();
                await auditService.log({
                    eventType: 'TAG_ID_INCONSISTENT',
                    severity: 'CRITICAL',
                    actorType: 'SYSTEM',
                    actorId: 'VerificationService',
                    payload: { tagInternalId, uid }
                });
                throw new Error("Tag não encontrada no sistema.");
            }

            // Audit Log: Success
            const { AuditLogService } = await import('../../services/audit/AuditLogService');
            const { metrics } = await import("../../utils/metrics");

            const auditService = new AuditLogService();
            await auditService.log({
                eventType: 'VERIFICATION_SUCCESS',
                severity: 'INFO',
                actorType: 'USER',
                actorId: 'ANONYMOUS',
                assetId: assetData.id,
                payload: {
                    tagInternalId: tagInternalId,
                    ctr: ctrValue,
                    hashTruncated: hashTruncated
                }
            });

            // Update Metrics
            metrics.verify_success_total.inc();
            metrics.sdm_valid_total.inc();

            return assetData;

        } catch (error: any) {
            // Audit Log: Failure (Generic)
            const { AuditLogService } = await import('../../services/audit/AuditLogService');
            const auditService = new AuditLogService();
            await auditService.log({
                eventType: 'VERIFICATION_FAILED',
                severity: 'WARNING',
                actorType: 'USER',
                actorId: 'ANONYMOUS',
                assetId: uid ? `tag_${uid}` : 'UNKNOWN',
                payload: {
                    error: error.message,
                    params: { d, m, r, uid }
                }
            });
            throw error;
        }
    }

    /**
     * Handle suspicious activity: Log audit and increment suspicious count
     */
    private async handleSuspiciousActivity(tagId: string, eventType: string, details: any) {
        const { AuditLogService } = await import('../../services/audit/AuditLogService');
        const { prisma } = await import("../../database/prismaClient");
        const { securityLogger } = await import("../../utils/logger");
        const { metrics } = await import("../../utils/metrics");

        const auditService = new AuditLogService();

        // 1. Log Audit
        await auditService.log({
            eventType: eventType,
            severity: 'CRITICAL',
            actorType: 'SYSTEM',
            actorId: 'VerificationService',
            assetId: tagId,
            payload: details
        });

        // 2. Structured Security Log
        securityLogger.warn(eventType, {
            tagId,
            details,
            severity: 'CRITICAL'
        });

        // 3. Update Metrics
        metrics.verify_fraud_total.inc();
        if (eventType.includes('REPLAY')) {
            metrics.sdm_replay_total.inc();
        }

        // 4. Update Tag Suspicious Count
        await prisma.nTAG424Tag.update({
            where: { id: tagId },
            data: {
                suspiciousCount: { increment: 1 },
                lastSuspiciousAt: new Date()
            }
        });
    }

    /**
     * Process offline scan event
     */
    async processOfflineScan(payload: { d: string; m: string; r?: string; uid?: string }) {
        await this.verifyTag(payload);
    }

    /**
     * Atualiza o contador aceito no banco de dados
     */
    protected async updateAcceptedCounter(tagInternalId: string, ctrValue: number): Promise<void> {
        const { prisma } = await import("../../database/prismaClient");
        await prisma.nTAG424Tag.update({
            where: { id: tagInternalId },
            data: { lastAcceptedCtr: ctrValue }
        });
    }
}
