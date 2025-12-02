import { prisma } from '../../database/prismaClient';
import { AuditLogService } from '../audit/AuditLogService';
import { Acr122uNfcHardwareDriver } from '../../modules/tag-encoding/driver/Acr122uNfcHardwareDriver';
import { NfcHardwareDriver } from '../../modules/tag-encoding/driver/NfcHardwareDriver';
import { Ntag424Encoder } from '../../modules/tag-encoding/encoder/Ntag424Encoder';
import { createAwsKmsClient } from '../../modules/tag-encoding/infra/AwsKmsClient';
import { TagEncodingJob } from '../../modules/tag-encoding/domain/TagEncodingTypes';

export class TagEncodingWorkerService {
    private auditService: AuditLogService;
    private driver: Acr122uNfcHardwareDriver | null = null;
    private encoder: Ntag424Encoder | null = null;
    private isInitializing: boolean = false;

    constructor() {
        this.auditService = new AuditLogService();
    }

    private async initializeDriver() {
        if (this.driver || this.isInitializing) return;
        this.isInitializing = true;

        try {
            console.log("[Worker] Initializing NFC Driver...");
            this.driver = new Acr122uNfcHardwareDriver();
            await this.driver.connect(5000); // 5s timeout

            // Initialize KMS
            const kms = createAwsKmsClient(
                process.env.KMS_MASTER_KEY_ID || 'mock-key',
                process.env.AWS_REGION || 'us-east-1'
            );

            this.encoder = new Ntag424Encoder(this.driver, kms, {
                ccSize: 32,
                ndefSize: 256,
                protectedSize: 128
            });
            console.log("[Worker] Driver and Encoder initialized successfully.");
        } catch (error) {
            console.error("[Worker] Failed to initialize driver:", error);
            this.driver = null;
            this.encoder = null;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    public async processNextJob(): Promise<boolean> {
        // 1. Pick next job
        const jobRecord = await prisma.encoderQueue.findFirst({
            where: {
                status: { in: ['PENDING', 'FAILED'] },
                attempts: { lt: 3 }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ],
            include: {
                config: true
            }
        });

        if (!jobRecord) {
            return false;
        }

        console.log(`👷 Worker picked job ${jobRecord.id} (Attempt ${jobRecord.attempts + 1})`);

        // Mark as IN_PROGRESS
        await prisma.encoderQueue.update({
            where: { id: jobRecord.id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
                attempts: { increment: 1 }
            }
        });

        try {
            // Ensure driver is ready
            try {
                await this.initializeDriver();
            } catch (driverError) {
                throw new Error(`Driver initialization failed: ${driverError.message}`);
            }

            if (!this.driver || !this.encoder) {
                throw new Error('Driver/Encoder not available');
            }

            // Map Prisma record to TagEncodingJob interface
            const job: TagEncodingJob = {
                id: jobRecord.id,
                assetId: jobRecord.partnerAssetId || 'UNKNOWN',
                tagInternalId: jobRecord.tagId || 'UNKNOWN',
                assetType: 'PRODUTO',
                falconMasterId: jobRecord.masterHashVaultKey,
                truncatedHash: jobRecord.hashTruncated,

                urlBase: jobRecord.config.sdmUrlTemplate.split('?')[0],
                sdmEncOffset: jobRecord.config.sdmEncOffset,
                sdmEncLength: jobRecord.config.sdmEncLength,
                sdmReadCtrOffset: jobRecord.config.sdmReadCtrOffset,
                sdmMacOffset: jobRecord.config.sdmMacOffset,
                sdmMacInputOffset: jobRecord.config.sdmMacInputOffset,

                status: 'EM_PROCESSO',
                attempts: jobRecord.attempts,
                createdAt: jobRecord.createdAt,
                updatedAt: new Date()
            };

            // Perform Encoding
            console.log(`[Worker] Starting encoding for Job ${job.id}...`);
            const result = await this.encoder.encode(job);
            console.log(`[Worker] Encoding success! UID: ${result.uid}`);

            // Success Update
            await prisma.$transaction(async (tx) => {
                // 1. Update Queue
                await tx.encoderQueue.update({
                    where: { id: jobRecord.id },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        encodedUid: result.uid,
                        errorMessage: null
                    }
                });

                // 2. Update Tag Record (if linked)
                if (jobRecord.tagId) {
                    await tx.nTAG424Tag.update({
                        where: { id: jobRecord.tagId },
                        data: {
                            uid: result.uid,
                            status: 'ACTIVE',
                            encodedAt: new Date(),
                            encodedBy: 'SYSTEM_WORKER',
                            // We could also update Falcon signatures here if returned by encoder
                        }
                    });
                }
            });

            // Audit Log
            await this.auditService.log({
                eventType: 'TAG_ENCODE_SUCCESS',
                severity: 'INFO',
                actorType: 'SYSTEM',
                actorId: 'TagEncodingWorker',
                assetId: jobRecord.partnerAssetId || 'UNKNOWN',
                payload: {
                    jobId: jobRecord.id,
                    uid: result.uid,
                    tagId: jobRecord.tagId
                }
            });

            return true;

        } catch (error: any) {
            console.error(`❌ Job ${jobRecord.id} failed:`, error.message);

            // Update Job Status
            await prisma.encoderQueue.update({
                where: { id: jobRecord.id },
                data: {
                    status: 'FAILED',
                    errorMessage: error.message
                }
            });

            // Audit Log Failure
            await this.auditService.log({
                eventType: 'TAG_ENCODE_FAILED',
                severity: 'ERROR',
                actorType: 'SYSTEM',
                actorId: 'TagEncodingWorker',
                assetId: jobRecord.partnerAssetId || 'UNKNOWN',
                payload: {
                    jobId: jobRecord.id,
                    error: error.message
                }
            });

            // Force driver reset on error to be safe
            if (this.driver) {
                try { await this.driver.disconnect(); } catch (e) { }
                this.driver = null;
                this.encoder = null;
            }

            return true; // Job processed (failed)
        }
    }

    public async processAllPending(limit: number = 10) {
        let processed = 0;
        for (let i = 0; i < limit; i++) {
            const didWork = await this.processNextJob();
            if (!didWork) break;
            processed++;
        }
        return processed;
    }
}

