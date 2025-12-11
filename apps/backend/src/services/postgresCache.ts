import pg from "pg";

const { Pool } = pg;

// Cache retention configuration
const CACHE_RETENTION_DAYS = 30;
const CACHE_RETENTION_SECONDS = CACHE_RETENTION_DAYS * 24 * 60 * 60; // 2592000 seconds

export class PostgresCache<T> {
  private pool: pg.Pool;
  private defaultTTL: number;
  private initialized = false;

  constructor(
    connectionString?: string,
    ttlSeconds: number = CACHE_RETENTION_SECONDS
  ) {
    const dbUrl = connectionString || process.env.DATABASE_URL;

    if (!dbUrl) {
      throw new Error(
        "DATABASE_URL is required for PostgresCache. Set it in environment variables."
      );
    }

    this.pool = new Pool({
      connectionString: dbUrl,
      max: 10, // Maximum connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.defaultTTL = ttlSeconds;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        ttl BIGINT NOT NULL
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cache_created_at ON cache(created_at)
    `);

    // Clean expired entries on startup
    await this.cleanExpired();

    this.initialized = true;
    console.log("🐘 PostgreSQL cache initialized");
  }

  async get(key: string): Promise<T | null> {
    const result = await this.pool.query(
      "SELECT value, created_at, ttl FROM cache WHERE key = $1",
      [key]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    // Check if expired
    const age = Math.floor(Date.now() / 1000) - Number(row.created_at);
    if (age > Number(row.ttl)) {
      await this.delete(key);
      console.log(`🗑️ Cache expired: ${key.substring(0, 50)}...`);
      return null;
    }

    console.log(
      `✨ Cache hit: ${key.substring(0, 50)}... (age: ${Math.floor(age / 60)}min)`
    );
    return JSON.parse(row.value) as T;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const ttlValue = ttl || this.defaultTTL;

    await this.pool.query(
      `INSERT INTO cache (key, value, created_at, ttl)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET value = $2, created_at = $3, ttl = $4`,
      [key, JSON.stringify(value), now, ttlValue]
    );

    console.log(
      `💾 Cache stored: ${key.substring(0, 50)}... (TTL: ${Math.floor(ttlValue / 86400)}d)`
    );
  }

  async delete(key: string): Promise<void> {
    await this.pool.query("DELETE FROM cache WHERE key = $1", [key]);
  }

  async clear(): Promise<void> {
    await this.pool.query("DELETE FROM cache");
    console.log("🗑️ Cache cleared");
  }

  async cleanExpired(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const result = await this.pool.query(
      "DELETE FROM cache WHERE created_at + ttl < $1",
      [now]
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`🗑️ Cleaned ${result.rowCount} expired cache entries`);
    }
  }

  async size(): Promise<number> {
    const result = await this.pool.query("SELECT COUNT(*) as count FROM cache");
    return Number.parseInt(result.rows[0].count, 10);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
