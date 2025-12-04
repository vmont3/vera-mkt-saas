declare module 'nfc-pcsc' {
    import { EventEmitter } from 'events';

    export class NFC extends EventEmitter {
        constructor(logger?: any);
        on(event: 'reader', listener: (reader: Reader) => void): this;
        on(event: 'error', listener: (err: any) => void): this;
    }

    export class Reader extends EventEmitter {
        name: string;
        aid: string;
        reader: any;

        on(event: 'card', listener: (card: Card) => void): this;
        on(event: 'card.off', listener: (card: Card) => void): this;
        on(event: 'error', listener: (err: any) => void): this;
        on(event: 'end', listener: () => void): this;

        transmit(data: Buffer, blockSize: number): Promise<Buffer>;
        connect(options?: any): Promise<void>;
        disconnect(): Promise<void>;
        close(): void;
    }

    export interface Card {
        atr?: Buffer;
        uid?: string; // hex string
        standard?: string;
    }
}
