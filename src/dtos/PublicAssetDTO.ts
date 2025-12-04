export interface PublicAssetDTO {
    publicId: string;
    type: string;
    status: string;
    metadata: any; // Sanitized
    category?: {
        slug: string;
        displayName: string;
        iconUrl?: string;
        uiSchema?: any;
    };
    createdAt: Date;
    updatedAt: Date;
    history: PublicOwnerHistoryDTO[];
    incidents: PublicIncidentDTO[];
    anchors: PublicAnchorDTO[];
}

export interface PublicOwnerHistoryDTO {
    event: string; // "OWNERSHIP_TRANSFER", "REGISTERED"
    timestamp: Date;
    blockchainTxId?: string | null;
    fromOwnerMasked?: string; // "owner_*****1234"
    toOwnerMasked?: string;   // "owner_*****5678"
}

export interface PublicIncidentDTO {
    type: string;
    status: string;
    date: Date;
    // No description or reporter info
}

export interface PublicAnchorDTO {
    txId: string;
    network: string;
    timestamp: Date;
}
