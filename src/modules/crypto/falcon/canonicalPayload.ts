/**
 * Canonical Payload Builder
 * 
 * Creates deterministic, canonical JSON payloads for asset data.
 * Ensures consistent signature generation across different environments.
 */

export interface AssetPayload {
    assetId: string;
    type: string;
    category?: string;
    issuedAt: string; // ISO-8601
    metadata?: Record<string, any>;
}

/**
 * Build a canonical JSON payload from asset data
 * 
 * Rules:
 * - Keys are sorted alphabetically
 * - No whitespace
 * - ISO-8601 timestamps
 * - UTF-8 encoding
 * 
 * @param data Asset data
 * @returns Canonical JSON string
 */
export function buildCanonicalPayload(data: AssetPayload): string {
    // Create a sorted object
    const canonical: Record<string, any> = {};

    // Add fields in alphabetical order
    if (data.assetId) canonical.assetId = data.assetId;
    if (data.category) canonical.category = data.category;
    if (data.issuedAt) canonical.issuedAt = data.issuedAt;
    if (data.metadata) canonical.metadata = sortObject(data.metadata);
    if (data.type) canonical.type = data.type;

    // Convert to JSON without whitespace
    return JSON.stringify(canonical);
}

/**
 * Recursively sort an object's keys
 */
function sortObject(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }

    if (obj !== null && typeof obj === 'object') {
        const sorted: Record<string, any> = {};
        Object.keys(obj)
            .sort()
            .forEach(key => {
                sorted[key] = sortObject(obj[key]);
            });
        return sorted;
    }

    return obj;
}

/**
 * Validate that a payload is canonical
 * @param payload JSON string
 * @returns true if payload is canonical
 */
export function isCanonical(payload: string): boolean {
    try {
        const obj = JSON.parse(payload);
        const rebuilt = buildCanonicalPayload(obj);
        return payload === rebuilt;
    } catch {
        return false;
    }
}
