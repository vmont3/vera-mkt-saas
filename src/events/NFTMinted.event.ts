export class NFTMintedEvent {
    constructor(
        public readonly assetId: string,
        public readonly timestamp: Date
    ) { }
}
