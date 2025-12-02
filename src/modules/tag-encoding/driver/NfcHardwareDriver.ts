export interface NfcHardwareDriver {
    connect(): Promise<void>;
    waitForTag(timeoutMs?: number): Promise<string>; // Returns UID
    getUid(): Promise<string>;
    transmit(apdu: Buffer): Promise<Buffer>;
    disconnect(): Promise<void>;
}
