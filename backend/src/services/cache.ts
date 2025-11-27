interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export class SimpleCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private ttlMs: number;

    constructor(ttlMinutes: number = 60) {
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        const age = Date.now() - entry.timestamp;
        if (age > this.ttlMs) {
            this.cache.delete(key);
            console.log(`🗑️ Cache expired: ${key}`);
            return null;
        }

        console.log(`✨ Cache hit: ${key}`);
        return entry.data;
    }

    set(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        console.log(`💾 Cache stored: ${key}`);
    }

    clear(): void {
        this.cache.clear();
        console.log(`🗑️ Cache cleared`);
    }

    size(): number {
        return this.cache.size;
    }
}
