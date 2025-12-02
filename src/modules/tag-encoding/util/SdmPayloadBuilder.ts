/**
 * SDM Payload Builder for NTAG 424 DNA
 * 
 * Constructs the 64-byte payload that will be encrypted in SDMENC:
 * - UID (7 bytes)
 * -  CTR (3 bytes)
 * - Hash Truncated (16 bytes)
 * - Tag Internal ID (36 bytes - UUID string)
 * - Version/Schema (2 bytes)
 * 
 * Total: 64 bytes
 */

export class SdmPayloadBuilder {
    /**
     * Build 64-byte SDM payload
     */
    static build(params: {
        uid: Buffer;           // 7 bytes - Real UID from tag
        ctr: Buffer;          // 3 bytes - SDMReadCtr
        hashTruncated: string; // 32 char hex string (16 bytes)
        tagInternalId: string; // UUID string (36 chars)
        version?: number;      // Schema version (default: 1)
    }): Buffer {
        if (params.uid.length !== 7) {
            throw new Error('UID must be exactly 7 bytes');
        }
        if (params.ctr.length !== 3) {
            throw new Error('CTR must be exactly 3 bytes');
        }
        if (params.hashTruncated.length !== 32) {
            throw new Error('Hash truncated must be 32 hex chars (16 bytes)');
        }
        if (params.tagInternalId.length !== 36) {
            throw new Error('Tag internal ID must be 36 chars (UUID format)');
        }

        const payload = Buffer.alloc(64);
        let offset = 0;

        // 1. UID (7 bytes)
        params.uid.copy(payload, offset);
        offset += 7;
        // 5. Version (2 bytes)
        const version = params.version || 1;
        payload.writeUInt16BE(version, offset);
        offset += 2;

        if (offset !== 64) {
            throw new Error(`Payload size mismatch: ${offset} !== 64`);
        }

        return payload;
    }

    /**
     * Parse 64-byte SDM payload (after decryption)
     */
    static parse(payload: Buffer): {
        uid: Buffer;
        ctr: Buffer;
        hashTruncated: string;
        tagInternalId: string;
        version: number;
    } {
        if (payload.length !== 64) {
            throw new Error(`Invalid payload length: ${payload.length} !== 64`);
        }

        let offset = 0;

        // 1. UID (7 bytes)
        const uid = payload.slice(offset, offset + 7);
        offset += 7;

        // 2. CTR (3 bytes)
        const ctr = payload.slice(offset, offset + 3);
        offset += 3;

        // 3. Hash Truncated (16 bytes)
        const hashBytes = payload.slice(offset, offset + 16);
        const hashTruncated = hashBytes.toString('hex');
        offset += 16;

        // 4. Tag Internal ID (36 bytes)
        const tagInternalId = payload.toString('utf-8', offset, offset + 36);
        offset += 36;

        // 5. Version (2 bytes)
        const version = payload.readUInt16BE(offset);
        offset += 2;

        return {
            uid,
            ctr,
            hashTruncated,
            tagInternalId,
            version
        };
    }

    /**
     * Get CTR value as number from buffer
     */
    static getCtrValue(ctr: Buffer): number {
        if (ctr.length !== 3) {
            throw new Error('CTR must be 3 bytes');
        }
        // Little-endian (NTAG 424 DNA standard)
        return ctr[0] | (ctr[1] << 8) | (ctr[2] << 16);
    }

    /**
     * Create CTR buffer from number
     */
    static createCtrBuffer(ctrValue: number): Buffer {
        const buf = Buffer.alloc(3);
        buf[0] = ctrValue & 0xFF;
        buf[1] = (ctrValue >> 8) & 0xFF;
        buf[2] = (ctrValue >> 16) & 0xFF;
        return buf;
    }
}
