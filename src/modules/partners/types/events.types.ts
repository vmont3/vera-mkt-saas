export enum PartnerEventType {
    ASSET_REGISTERED = 'onAssetRegistered',
    ASSET_VALIDATED = 'onAssetValidated',
    ASSET_ANCHORED = 'onAssetAnchored',
    OWNERSHIP_TRANSFERRED = 'onOwnershipTransferred',
    SIGNATURE_REQUIRED = 'onSignatureRequired',
    SIGNATURE_COMPLETED = 'onSignatureCompleted',
    BATCH_ANCHORED = 'onBatchAnchored',
    FRAUD_DETECTED = 'onFraudDetected',
}

export interface PartnerEventPayload {
    eventId: string;
    eventType: PartnerEventType;
    partnerId: string;
    assetId?: string;
    batchId?: string;
    timestamp: Date;
    data: any;
}
