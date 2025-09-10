import { cacheService, CacheOptions } from "./cacheService";
import { logger } from "../utils/logger";

/**
 * Cache service wrapper that provides graceful degradation
 * This wrapper allows callers to explicitly choose between fail-fast behavior
 * and graceful degradation when cache is unavailable
 */
class CacheServiceWrapper {
  /**
   * Get a value from cache with graceful degradation
   * Returns null if cache is unavailable instead of throwing
   */
  async getWithFallback<T = any>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      return await cacheService.get<T>(key, options);
    } catch (error) {
      logger.warn(
        `Cache get failed for key ${key}, falling back to null:`,
        error
      );
      return null;
    }
  }

  /**
   * Set a value in cache with graceful degradation
   * Returns false if cache is unavailable instead of throwing
   */
  async setWithFallback(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      return await cacheService.set(key, value, options);
    } catch (error) {
      logger.warn(
        `Cache set failed for key ${key}, continuing without cache:`,
        error
      );
      return false;
    }
  }

  /**
   * Delete a value from cache with graceful degradation
   * Returns false if cache is unavailable instead of throwing
   */
  async deleteWithFallback(
    key: string,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      return await cacheService.delete(key, options);
    } catch (error) {
      logger.warn(
        `Cache delete failed for key ${key}, continuing without cache:`,
        error
      );
      return false;
    }
  }

  /**
   * Check if a key exists in cache with graceful degradation
   * Returns false if cache is unavailable instead of throwing
   */
  async existsWithFallback(
    key: string,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      return await cacheService.exists(key, options);
    } catch (error) {
      logger.warn(
        `Cache exists check failed for key ${key}, returning false:`,
        error
      );
      return false;
    }
  }

  // Direct access to the underlying cache service for fail-fast behavior
  get failFast() {
    return cacheService;
  }

  // Health check and stats methods (these are safe to call directly)
  async isHealthy(): Promise<boolean> {
    return cacheService.isHealthy();
  }

  getStats() {
    return cacheService.getStats();
  }

  resetStats() {
    return cacheService.resetStats();
  }

  getHitRatio() {
    return cacheService.getHitRatio();
  }
}

// Create singleton instance
export const cacheServiceWrapper = new CacheServiceWrapper();

// Export both the fail-fast service and the wrapper for different use cases
export { cacheService as cacheServiceFailFast };
