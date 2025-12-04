/**
 * HashService - Manages master hash truncation for NTAG 424 DNA tags
 * 
 * Master hash (Falcon-based, ~600+ bytes) is truncated to fit in tag memory
 * while maintaining collision resistance and uniqueness
 */
export class HashService {
    /**
     * Truncate master hash to target bit length
     * @param masterHash Full Falcon master hash (hex string)
     * @param targetBits Target bit length (default 128 for NTAG 424 DNA)
     * @returns Truncated hash (hex string)
     */
    truncateHash(masterHash: string, targetBits: number = 128): string {
        // Calculate number of hex characters needed
        // Each hex char = 4 bits, so 128 bits = 32 hex chars
        const hexChars = targetBits / 4;

        if (masterHash.length < hexChars) {
            throw new Error(`Master hash too short for truncation to ${targetBits} bits`);
        }

        // Take the first N hex characters
        return masterHash.substring(0, hexChars);
    }

    /**
     * Verify if a truncated hash could have come from a master hash
     * @param truncated Truncated hash from tag
     * @param master Master hash from vault
     * @param targetBits Bit length of truncation
     * @returns true if truncated matches the beginning of master
     */
    verifyTruncation(truncated: string, master: string, targetBits: number = 128): boolean {
        const expectedTruncated = this.truncateHash(master, targetBits);
        return truncated === expectedTruncated;
    }

    /**
     * Calculate storage efficiency
     * @param masterHashLength Length of master hash in bytes
     * @param truncatedBits Truncated bit length
     * @returns Compression ratio
     */
    getCompressionRatio(masterHashLength: number, truncatedBits: number): number {
        const truncatedBytes = truncatedBits / 8;
        return masterHashLength / truncatedBytes;
    }
}
