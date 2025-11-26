export interface NTAGMemoryMap {
    uid: string;           // Factory UID (read-only)
    hTrunc: string;        // PAGE 8-15: truncated hash
    integrityCode: string; // PAGE 16-19: HMAC/CRC
    counter: number;       // PAGE 20: monotonic counter
    verifyUrl: string;     // PAGE 4-7: short URL for verification
}

export interface MemoryLayout {
    uidPages: [0, 1, 2];      // Factory UID (read-only)
    urlPages: [4, 5, 6, 7];   // Verification URL
    hTruncPages: [8, 9, 10, 11, 12, 13, 14, 15]; // 128-bit hash
    integrityPages: [16, 17, 18, 19]; // 64-bit HMAC
    counterPage: 20;          // 32-bit counter
    lockBits: [2, 3];         // Lock configuration
}

export function buildNTAGPayload(data: {
    uid: string;
    hTrunc: string;
    integrityCode: string;
    counter: number;
    tagId: string;
}): NTAGMemoryMap {
    return {
        uid: data.uid,
        hTrunc: data.hTrunc,
        integrityCode: data.integrityCode,
        counter: data.counter,
        verifyUrl: `https://qc.app/v/${data.tagId}`,
    };
}
