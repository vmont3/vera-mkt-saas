interface CacheEntry<T> {
    value: T;
    expiry: number;
}

export class CacheService {
    private cache: Map<string, CacheEntry<any>> = new Map();

    /**
     * Get a value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Set a value in cache with TTL (seconds)
     */
    set<T>(key: string, value: T, ttlSeconds: number = 60): void {
        const expiry = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiry });
    }

    /**
     * Clear specific key
     */
    del(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    flush(): void {
        this.cache.clear();
    }
}

export const publicCache = new CacheService();
