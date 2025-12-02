import { NFC } from 'nfc-pcsc';
import { NfcHardwareDriver } from './NfcHardwareDriver';

export class Acr122uNfcHardwareDriver implements NfcHardwareDriver {
    private nfc: any | null = null;
    private reader: any | null = null;
    private card: any | null = null;
    private logger: any;

    constructor(logger?: any) {
        this.logger = logger || console;
    }

    async connect(timeoutMs: number = 5000): Promise<void> {
        if (this.reader) return; // Already connected

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (!this.reader) {
                    this.nfc?.close();
                    reject(new Error(`No ACR122U reader detected within ${timeoutMs}ms`));
                }
            }, timeoutMs);

            try {
                this.nfc = new NFC(this.logger);

                this.nfc.on('reader', (reader: any) => {
                    // Only accept ACR122U or compatible
                    if (reader.name.toLowerCase().includes('acr122') || reader.name.toLowerCase().includes('acs')) {
                        this.logger.log(`[ACR122U] Reader detected: ${reader.name}`);
                        this.reader = reader;
                        this.reader.autoProcessing = false; // Disable auto-processing for raw APDU

                        this.setupReaderEvents(reader);
                        clearTimeout(timer);
                        resolve();
                    } else {
                        this.logger.warn(`[ACR122U] Ignoring non-ACS reader: ${reader.name}`);
                    }
                });

                this.nfc.on('error', (err: any) => {
                    this.logger.error(`[ACR122U] NFC error:`, err);
                    // Don't reject immediately on global error, wait for timeout
                });

            } catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    private setupReaderEvents(reader: any) {
        reader.on('card', (card: any) => {
            this.logger.log(`[ACR122U] Card detected: ${card.uid}`);
            this.card = card;
        });

        reader.on('card.off', () => {
            this.logger.log(`[ACR122U] Card removed`);
            this.card = null;
        });

        reader.on('error', (err: any) => {
            this.logger.error(`[ACR122U] Reader error:`, err);
        });

        reader.on('end', () => {
            this.logger.log(`[ACR122U] Reader disconnected`);
            this.reader = null;
            this.card = null;
        });
    }

    async waitForTag(timeoutMs: number = 20000): Promise<string> {
        if (!this.reader) {
            throw new Error("Driver not connected. Call connect() first.");
        }

        if (this.card && this.card.uid) {
            return this.card.uid;
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("Timeout waiting for tag"));
            }, timeoutMs);

            const onCard = (card: any) => {
                cleanup();
                resolve(card.uid);
            };

            const cleanup = () => {
                clearTimeout(timeout);
                if (this.reader) {
                    this.reader.removeListener('card', onCard);
                    // Re-attach default listener if needed, but we used a separate one
                }
            };

            // We need to listen to the 'card' event. 
            // Since we already have a listener in setupReaderEvents, adding another one is fine.
            this.reader.on('card', onCard);
        });
    }

    async getUid(): Promise<string> {
        if (!this.card || !this.card.uid) {
            throw new Error("No tag present");
        }
        return this.card.uid;
    }

    async transmit(apdu: Buffer): Promise<Buffer> {
        if (!this.reader) {
            throw new Error("Reader not connected");
        }

        // ACR122U max APDU size is usually 255 or extended 4096 depending on mode.
        // Standard is 255 bytes for short APDU.
        const responseMaxLength = 1024;

        try {
            const response = await this.reader.transmit(apdu, responseMaxLength);
            return response;
        } catch (err) {
            this.logger.error(`[ACR122U] Transmit error:`, err);
            throw new Error(`Transmit failed: ${(err as Error).message}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.reader) {
            this.reader.close();
            this.reader.removeAllListeners();
        }
        if (this.nfc) {
            this.nfc.close();
        }
        this.nfc = null;
        this.reader = null;
        this.card = null;
    }
}

