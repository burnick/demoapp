import { redisConnection, RedisClientType } from "../utils/redis";
import { logger } from "../utils/logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix for namespacing
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

class CacheService {
  private client: RedisClientType | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  async initialize(): Promise<void> {
    try {
      this.client = await redisConnection.connect();
      logger.info("Cache service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize cache service:", error);
      throw error;
    }
  }

  private ensureClient(): RedisClientType {
    if (!this.client) {
      throw new Error(
        "Cache service not initialized. Call initialize() first."
      );
    }
    return this.client;
  }

  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      const client = this.ensureClient();
      const fullKey = this.buildKey(key, options.prefix);

      const value = await client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      this.stats.misses++;
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Set a value in cache
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const fullKey = this.buildKey(key, options.prefix);
      const serializedValue = JSON.stringify(value);

      if (options.ttl) {
        await client.setEx(fullKey, options.ttl, serializedValue);
      } else {
        await client.set(fullKey, serializedValue);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const fullKey = this.buildKey(key, options.prefix);

      const result = await client.del(fullKey);
      this.stats.deletes++;

      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const fullKey = this.buildKey(key, options.prefix);

      const result = await client.exists(fullKey);
      return result > 0;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(
    key: string,
    ttl: number,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const client = this.ensureClient();
      const fullKey = this.buildKey(key, options.prefix);

      const result = await client.expire(fullKey, ttl);
      return result;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T = any>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<(T | null)[]> {
    try {
      const client = this.ensureClient();
      const fullKeys = keys.map((key) => this.buildKey(key, options.prefix));

      const values = await client.mGet(fullKeys);

      return values.map((value) => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return JSON.parse(value) as T;
      });
    } catch (error) {
      logger.error(`Cache mget error for keys ${keys.join(", ")}:`, error);
      this.stats.misses += keys.length;
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const client = this.ensureClient();

      // For keys with TTL, we need to set them individually
      const withTtl = keyValuePairs.filter((pair) => pair.ttl);
      const withoutTtl = keyValuePairs.filter((pair) => !pair.ttl);

      // Set keys without TTL in batch
      if (withoutTtl.length > 0) {
        const msetArgs: string[] = [];
        withoutTtl.forEach((pair) => {
          msetArgs.push(this.buildKey(pair.key, options.prefix));
          msetArgs.push(JSON.stringify(pair.value));
        });
        await client.mSet(msetArgs);
      }

      // Set keys with TTL individually
      for (const pair of withTtl) {
        if (pair.ttl !== undefined) {
          await this.set(pair.key, pair.value, { ...options, ttl: pair.ttl });
        }
      }

      this.stats.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      logger.error("Cache mset error:", error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete multiple keys from cache
   */
  async mdel(keys: string[], options: CacheOptions = {}): Promise<number> {
    try {
      const client = this.ensureClient();
      const fullKeys = keys.map((key) => this.buildKey(key, options.prefix));

      const result = await client.del(fullKeys);
      this.stats.deletes += result;

      return result;
    } catch (error) {
      logger.error(`Cache mdel error for keys ${keys.join(", ")}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Clear all keys with a specific prefix
   */
  async clearPrefix(prefix: string): Promise<number> {
    try {
      const client = this.ensureClient();
      const pattern = `${prefix}:*`;

      const keys = await client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      this.stats.deletes += result;

      return result;
    } catch (error) {
      logger.error(`Cache clearPrefix error for prefix ${prefix}:`, error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Flush all cache data
   */
  async flush(): Promise<boolean> {
    try {
      const client = this.ensureClient();
      await client.flushDb();

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
      };

      return true;
    } catch (error) {
      logger.error("Cache flush error:", error);
      // Fail fast - don't hide cache errors, let the caller handle degraded functionality
      throw new Error(
        `Cache operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Get cache hit ratio
   */
  getHitRatio(): number {
    const total = this.stats.hits + this.stats.misses;
    return total === 0 ? 0 : this.stats.hits / total;
  }

  /**
   * Check if cache service is healthy
   * Note: This method is explicitly designed to return boolean status for health checks
   * and does not throw errors as it's used for monitoring/observability purposes
   */
  async isHealthy(): Promise<boolean> {
    try {
      return await redisConnection.ping();
    } catch (error) {
      logger.error("Cache health check failed:", error);
      // Health checks are explicitly allowed to return false instead of throwing
      // This is for monitoring/observability and doesn't hide operational errors
      return false;
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();
