import algosdk from 'algosdk';
import { prisma } from '../../database/prismaClient';
import { blockchainLogger } from '../../utils/logger';
import { metrics } from '../../utils/metrics';
import { AuditLogService } from '../audit/AuditLogService';
import { WebhookDispatcherService } from '../webhook/WebhookDispatcherService';

const auditService = new AuditLogService();
const webhookDispatcher = new WebhookDispatcherService();

export class AlgorandAnchorService {
    private algodClient: algosdk.Algodv2;
    private account: algosdk.Account | null = null;
    private network: string;

    constructor() {
        const algodToken = process.env.ALGOD_TOKEN || '';
        const algodServer = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
        const algodPort = process.env.ALGOD_PORT || '';
        this.network = process.env.ALGORAND_NETWORK || 'testnet';

        this.algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

        const mnemonic = process.env.ALGORAND_QC_ACCOUNT_MNEMONIC;
        if (mnemonic) {
            try {
                this.account = algosdk.mnemonicToSecretKey(mnemonic);
            } catch (e) {
                console.error('❌ Invalid ALGORAND_QC_ACCOUNT_MNEMONIC:', e);
            }
        } else {
            console.warn('⚠️  ALGORAND_QC_ACCOUNT_MNEMONIC not set. Anchoring will fail.');
        }
    }

    /**
     * Anchors an asset to the Algorand blockchain.
     * Sends a 0 ALGO transaction with the asset ID and Falcon hash in the note field.
     * Implements exponential backoff retry logic.
     */
    async anchorAsset(assetId: string, falconMasterHashHex: string): Promise<{ txId: string }> {
        if (!this.account) {
            throw new Error('Algorand account not configured');
        }

        const maxRetries = 3;
        let attempt = 0;
        let lastError: any;

        while (attempt < maxRetries) {
            try {
                attempt++;
                if (attempt > 1) console.log(`🔄 Anchoring attempt ${attempt}/${maxRetries} for asset ${assetId}...`);

                const suggestedParams = await this.algodClient.getTransactionParams().do();

                const notePayload = {
                    v: 1,
                    assetId: assetId,
                    falconHash: falconMasterHashHex,
                };
                const note = new Uint8Array(Buffer.from(JSON.stringify(notePayload)));

                // Create payment txn (0 ALGO) sending to self with note
                const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                    from: this.account.addr,
                    to: this.account.addr,
                    amount: 0,
                    note: note,
                    suggestedParams: suggestedParams,
                } as any);

                // Sign the transaction
                const signedTxn = txn.signTxn(this.account.sk);
                const sendResult = await this.algodClient.sendRawTransaction(signedTxn).do();
                const txId = sendResult.txid;

                // Wait for confirmation
                await algosdk.waitForConfirmation(this.algodClient, txId, 4);

                // Store Anchor Record
                await prisma.blockchainAnchor.create({
                    data: {
                        assetId,
                        txId,
                        network: this.network,
                        falconHash: falconMasterHashHex,
                    }
                });

                // Audit Log
                await auditService.log({
                    eventType: 'ANCHORING_SUCCESS',
                    severity: 'INFO',
                    actorType: 'SYSTEM',
                    actorId: 'AlgorandAnchorService',
                    assetId: assetId,
                    payload: {
                        txId,
                        network: this.network,
                        falconHash: falconMasterHashHex
                    }
                });

                // Webhook Event
                await webhookDispatcher.queueEvent('anchor.created', {
                    assetId,
                    txId,
                    network: this.network,
                    timestamp: new Date()
                });

                // Structured Logging
                blockchainLogger.info('Asset Anchored', {
                    assetId,
                    txId,
                    network: this.network,
                    falconHash: falconMasterHashHex
                });

                // Metrics
                metrics.anchor_success_total.inc();

                return { txId };

            } catch (error: any) {
                lastError = error;
                console.error(`⚠️ Anchoring attempt ${attempt} failed:`, error.message);

                // Metrics
                metrics.anchor_fail_total.inc();

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // Final Failure Handling
        console.error('❌ Failed to anchor asset to Algorand after retries:', lastError);

        // Audit Log: Failure
        await auditService.log({
            eventType: 'ANCHORING_FAILED',
            severity: 'ERROR',
            actorType: 'SYSTEM',
            actorId: 'AlgorandAnchorService',
            assetId: assetId,
            payload: {
                error: lastError.message,
                falconHash: falconMasterHashHex,
                attempts: attempt
            }
        });

        // Structured Logging
        blockchainLogger.error('Anchoring Failed', {
            assetId,
            error: lastError.message,
            falconHash: falconMasterHashHex
        });

        // Queue for background retry (PendingAnchor)
        try {
            await prisma.pendingAnchor.create({
                data: {
                    assetId,
                    falconHash: falconMasterHashHex,
                    lastError: lastError.message,
                    attempts: attempt
                }
            });
            console.log(`📥 Queued PendingAnchor for asset ${assetId} for background processing.`);
        } catch (dbError) {
            console.error('❌ Failed to save PendingAnchor:', dbError);
        }

        throw lastError;
    }

    /**
     * Retrieves anchor information for a given asset.
     */
    async getAnchorsForAsset(assetId: string) {
        return prisma.blockchainAnchor.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
    }
}

