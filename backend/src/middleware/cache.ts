import { TRPCError } from '@trpc/server';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

export interface CacheMiddlewareOptions {
  ttl?: number; // Cache TTL in seconds
  prefix?: string; // Cache key prefix
  keyGenerator?: (input: any, ctx: any) => string; // Custom key generator
  skipCache?: (input: any, ctx: any) => boolean; // Function to determine if cache should be skipped
  skipCacheOnError?: boolean; // Skip cache if there's an error (default: true)
}

/**
 * Create a cache key from input parameters
 */
function createCacheKey(
  procedureName: string,
  input: any,
  ctx: any,
  keyGenerator?: (input: any, ctx: any) => string
): string {
  if (keyGenerator) {
    return `${procedureName}:${keyGenerator(input, ctx)}`;
  }

  // Default key generation
  const inputHash = input ? JSON.stringify(input) : 'no-input';
  const userId = ctx.user?.id || 'anonymous';
  
  return `${procedureName}:${userId}:${Buffer.from(inputHash).toString('base64')}`;
}

/**
 * tRPC middleware for caching procedure results
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  return async function cacheMiddleware(opts: any) {
    const { next, path, input, ctx } = opts;
    
    const {
      ttl = 300, // 5 minutes default
      prefix = 'trpc',
      keyGenerator,
      skipCache,
      skipCacheOnError = true,
    } = options;

    // Check if cache should be skipped
    if (skipCache && skipCache(input, ctx)) {
      return next();
    }

    const cacheKey = createCacheKey(path, input, ctx, keyGenerator);
    
    try {
      // Try to get cached result
      const cachedResult = await cacheService.get(cacheKey, { prefix });
      
      if (cachedResult !== null) {
        logger.debug(`Cache hit for ${path}: ${cacheKey}`);
        return cachedResult;
      }

      logger.debug(`Cache miss for ${path}: ${cacheKey}`);
      
      // Execute the procedure
      const result = await next();
      
      // Cache the result (only if successful)
      if (result && !result.error) {
        await cacheService.set(cacheKey, result, { prefix, ttl });
        logger.debug(`Cached result for ${path}: ${cacheKey}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Cache middleware error for ${path}:`, error);
      
      if (skipCacheOnError) {
        // If cache fails, continue without cache
        return next();
      }
      
      throw error;
    }
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  /**
   * Invalidate cache for a specific procedure and input
   */
  static async invalidateProcedure(
    procedureName: string,
    input?: any,
    ctx?: any,
    options: { prefix?: string; keyGenerator?: (input: any, ctx: any) => string } = {}
  ): Promise<boolean> {
    try {
      const { prefix = 'trpc', keyGenerator } = options;
      const cacheKey = createCacheKey(procedureName, input, ctx, keyGenerator);
      
      const deleted = await cacheService.delete(cacheKey, { prefix });
      
      if (deleted) {
        logger.debug(`Invalidated cache for ${procedureName}: ${cacheKey}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to invalidate cache for ${procedureName}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all cache entries for a specific procedure
   */
  static async invalidateAllForProcedure(
    procedureName: string,
    options: { prefix?: string } = {}
  ): Promise<number> {
    try {
      const { prefix = 'trpc' } = options;
      const pattern = `${prefix}:${procedureName}`;
      
      const deleted = await cacheService.clearPrefix(pattern);
      
      if (deleted > 0) {
        logger.debug(`Invalidated ${deleted} cache entries for ${procedureName}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to invalidate all cache for ${procedureName}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate cache for a specific user
   */
  static async invalidateForUser(
    userId: string,
    options: { prefix?: string } = {}
  ): Promise<number> {
    try {
      const { prefix = 'trpc' } = options;
      const pattern = `${prefix}:*:${userId}`;
      
      const deleted = await cacheService.clearPrefix(pattern);
      
      if (deleted > 0) {
        logger.debug(`Invalidated ${deleted} cache entries for user ${userId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error(`Failed to invalidate cache for user ${userId}:`, error);
      return 0;
    }
  }
}

/**
 * Decorator for automatic cache invalidation
 */
export function invalidateCache(
  procedures: string[],
  options: { prefix?: string } = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      
      // Invalidate specified procedures after successful execution
      for (const procedure of procedures) {
        await CacheInvalidator.invalidateAllForProcedure(procedure, options);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * Predefined cache configurations for common use cases
 */
export const CacheConfigs = {
  // Short-term cache for frequently changing data
  shortTerm: {
    ttl: 60, // 1 minute
    prefix: 'short',
  },
  
  // Medium-term cache for moderately changing data
  mediumTerm: {
    ttl: 300, // 5 minutes
    prefix: 'medium',
  },
  
  // Long-term cache for rarely changing data
  longTerm: {
    ttl: 3600, // 1 hour
    prefix: 'long',
  },
  
  // User-specific cache
  userSpecific: {
    ttl: 900, // 15 minutes
    prefix: 'user',
    keyGenerator: (input: any, ctx: any) => {
      const userId = ctx.user?.id || 'anonymous';
      const inputStr = input ? JSON.stringify(input) : '';
      return `${userId}:${Buffer.from(inputStr).toString('base64')}`;
    },
  },
  
  // Public data cache (no user context)
  publicData: {
    ttl: 1800, // 30 minutes
    prefix: 'public',
    keyGenerator: (input: any) => {
      return input ? JSON.stringify(input) : 'no-input';
    },
  },
};

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm cache for a specific procedure
   */
  static async warmProcedure(
    procedureName: string,
    inputs: any[],
    procedureFunction: (input: any) => Promise<any>,
    options: CacheMiddlewareOptions = {}
  ): Promise<number> {
    let warmedCount = 0;
    
    for (const input of inputs) {
      try {
        const result = await procedureFunction(input);
        
        if (result) {
          const { ttl = 300, prefix = 'trpc' } = options;
          const cacheKey = createCacheKey(procedureName, input, {}, options.keyGenerator);
          
          await cacheService.set(cacheKey, result, { prefix, ttl });
          warmedCount++;
        }
      } catch (error) {
        logger.error(`Failed to warm cache for ${procedureName} with input:`, input, error);
      }
    }
    
    logger.info(`Warmed ${warmedCount} cache entries for ${procedureName}`);
    return warmedCount;
  }
}