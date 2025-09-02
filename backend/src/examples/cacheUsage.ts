/**
 * Example usage of Redis caching in tRPC procedures
 * This file demonstrates how to use the caching middleware and services
 */

import { z } from 'zod';
import { createCacheMiddleware, CacheConfigs, CacheInvalidator } from '../middleware/cache';
import { cacheService, sessionService } from '../services';
import { publicProcedure, protectedProcedure } from '../trpc/router';

// Example 1: Using cache middleware for a public data endpoint
export const getPublicDataWithCache = publicProcedure
  .input(z.object({
    category: z.string(),
    limit: z.number().optional().default(10),
  }))
  .use(createCacheMiddleware(CacheConfigs.publicData))
  .query(async ({ input }) => {
    // This would normally fetch from database
    // The result will be cached automatically by the middleware
    return {
      category: input.category,
      items: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        category: input.category,
      })),
      timestamp: new Date(),
    };
  });

// Example 2: Using cache middleware for user-specific data
export const getUserDataWithCache = protectedProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .use(createCacheMiddleware(CacheConfigs.userSpecific))
  .query(async ({ input, ctx }) => {
    // This would normally fetch user-specific data from database
    return {
      userId: input.userId,
      profile: {
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          language: 'en',
        },
      },
      lastLogin: new Date(),
    };
  });

// Example 3: Manual cache usage in a procedure
export const getDataWithManualCache = publicProcedure
  .input(z.object({
    key: z.string(),
  }))
  .query(async ({ input }) => {
    const cacheKey = `manual-data:${input.key}`;
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return {
        data: cachedData,
        fromCache: true,
      };
    }

    // Generate new data (simulate expensive operation)
    const newData = {
      key: input.key,
      value: Math.random(),
      generatedAt: new Date(),
    };

    // Cache the result for 5 minutes
    await cacheService.set(cacheKey, newData, { ttl: 300 });

    return {
      data: newData,
      fromCache: false,
    };
  });

// Example 4: Procedure that invalidates cache
export const updateUserData = protectedProcedure
  .input(z.object({
    userId: z.string(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Update user data in database (simulated)
    const updatedUser = {
      id: input.userId,
      name: input.name || 'Updated Name',
      email: input.email || 'updated@example.com',
      updatedAt: new Date(),
    };

    // Invalidate user-specific cache
    await CacheInvalidator.invalidateForUser(input.userId);
    
    // Also invalidate specific procedures
    await CacheInvalidator.invalidateAllForProcedure('getUserDataWithCache');

    return updatedUser;
  });

// Example 5: Session management in authentication
export const loginWithSession = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Authenticate user (simulated)
    const user = {
      id: 'user123',
      email: input.email,
      name: 'John Doe',
    };

    // Create session
    const sessionId = await sessionService.createSession(user.id, {
      email: user.email,
      name: user.name,
      ipAddress: ctx.req?.ip,
      userAgent: ctx.req?.headers['user-agent'],
    });

    return {
      user,
      sessionId,
      message: 'Login successful',
    };
  });

// Example 6: Session validation middleware
export const getSessionInfo = publicProcedure
  .input(z.object({
    sessionId: z.string(),
  }))
  .query(async ({ input }) => {
    const session = await sessionService.getSession(input.sessionId);
    
    if (!session) {
      throw new Error('Invalid session');
    }

    return {
      userId: session.userId,
      email: session.email,
      name: session.name,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
    };
  });

// Example 7: Logout and session cleanup
export const logoutWithSession = protectedProcedure
  .input(z.object({
    sessionId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const deleted = await sessionService.deleteSession(input.sessionId);
    
    return {
      success: deleted,
      message: deleted ? 'Logout successful' : 'Session not found',
    };
  });

// Example 8: Cache warming utility
export const warmCache = publicProcedure
  .input(z.object({
    categories: z.array(z.string()),
  }))
  .mutation(async ({ input }) => {
    const warmedCount = await Promise.all(
      input.categories.map(async (category) => {
        const data = {
          category,
          items: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Item ${i + 1}`,
            category,
          })),
          timestamp: new Date(),
        };

        return cacheService.set(
          `public-data:${category}`,
          data,
          { ttl: 1800, prefix: 'public' }
        );
      })
    );

    return {
      warmedCategories: input.categories.length,
      successCount: warmedCount.filter(Boolean).length,
    };
  });

// Example 9: Cache statistics endpoint
export const getCacheStats = publicProcedure
  .query(async () => {
    const cacheStats = cacheService.getStats();
    const isHealthy = await cacheService.isHealthy();

    return {
      cache: {
        ...cacheStats,
        hitRatio: cacheService.getHitRatio(),
        isHealthy,
      },
      sessions: await sessionService.getSessionStats(),
    };
  });

// Example 10: Conditional caching based on user role
export const getDataWithConditionalCache = protectedProcedure
  .input(z.object({
    dataType: z.string(),
  }))
  .use(createCacheMiddleware({
    ...CacheConfigs.mediumTerm,
    skipCache: (input, ctx) => {
      // Skip cache for admin users to always get fresh data
      return ctx.user?.role === 'admin';
    },
  }))
  .query(async ({ input, ctx }) => {
    return {
      dataType: input.dataType,
      data: `Data for ${input.dataType}`,
      userRole: 'user', // ctx.user?.role - role property not available in current AuthUser type
      timestamp: new Date(),
    };
  });