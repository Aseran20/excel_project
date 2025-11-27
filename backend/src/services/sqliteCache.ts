import Database from 'better-sqlite3';
import path from 'path';

interface CacheEntry {
    key: string;
    value: string;
    created_at: number;
    ttl: number;
}

export class SQLiteCache<T> {
    private db: Database.Database;
    private defaultTTL: number;

    constructor(dbPath: string = './cache.db', ttlSeconds: number = 604800) {
        this.db = new Database(dbPath);
        this.defaultTTL = ttlSeconds;
        this.initializeDatabase();
    }

    private initializeDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cache (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                ttl INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_created_at ON cache(created_at);
        `);

        // Clean expired entries on startup
        this.cleanExpired();
        console.log('💾 SQLite cache initialized');
    }

    get(key: string): T | null {
        const stmt = this.db.prepare(`
            SELECT value, created_at, ttl 
            FROM cache 
            WHERE key = ?
        `);

        const row = stmt.get(key) as CacheEntry | undefined;

        if (!row) {
            return null;
        }

        // Check if expired
        const age = Math.floor(Date.now() / 1000) - row.created_at;
        if (age > row.ttl) {
            this.delete(key);
            console.log(`🗑️ Cache expired: ${key.substring(0, 50)}...`);
            return null;
        }

        console.log(`✨ Cache hit: ${key.substring(0, 50)}... (age: ${Math.floor(age / 60)}min)`);
        return JSON.parse(row.value) as T;
    }

    set(key: string, value: T, ttl?: number): void {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO cache (key, value, created_at, ttl)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(
            key,
            JSON.stringify(value),
            Math.floor(Date.now() / 1000),
            ttl || this.defaultTTL
        );

        console.log(`💾 Cache stored: ${key.substring(0, 50)}... (TTL: ${Math.floor((ttl || this.defaultTTL) / 86400)}d)`);
    }

    delete(key: string): void {
        const stmt = this.db.prepare('DELETE FROM cache WHERE key = ?');
        stmt.run(key);
    }

    clear(): void {
        this.db.exec('DELETE FROM cache');
        console.log('🗑️ Cache cleared');
    }

    cleanExpired(): void {
        const now = Math.floor(Date.now() / 1000);
        const stmt = this.db.prepare(`
            DELETE FROM cache 
            WHERE created_at + ttl < ?
        `);
        const result = stmt.run(now);
        if (result.changes > 0) {
            console.log(`🗑️ Cleaned ${result.changes} expired cache entries`);
        }
    }

    size(): number {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM cache');
        const row = stmt.get() as { count: number };
        return row.count;
    }

    close(): void {
        this.db.close();
    }
}
