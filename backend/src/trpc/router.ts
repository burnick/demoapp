import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError, z } from 'zod';
import { OpenApiMeta } from 'trpc-openapi';
import { Context } from './context';
import { Logger } from '../utils/logger';
import { ErrorHandler, ApiError } from '../utils/errors';
import { createOpenApiMeta } from '../utils/openapi';

/**
 * Initialize tRPC with context
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    // Log the error
    const logLevel = ErrorHandler.getLogLevel(error.cause || error);
    const errorData = ErrorHandler.formatForLogging(error.cause || error);
    
    Logger[logLevel]('tRPC Error', {
      requestId: ctx?.requestId,
      code: error.code,
      message: error.message,
      ...errorData,
    });

    // Format error for response
    if (error.cause instanceof ApiError) {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: error.cause.code,
          httpStatus: error.cause.statusCode,
          details: error.cause.details,
        },
      };
    }

    if (error.cause instanceof ZodError) {
      return {
        ...shape,
        data: {
          ...shape.data,
          code: 'VALIDATION_ERROR',
          httpStatus: 400,
          validationErrors: error.cause.errors,
        },
      };
    }

    return shape;
  },
});

/**
 * Base router
 */
export const router = t.router;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Public procedure with OpenAPI meta support
 */
export const openApiProcedure = t.procedure;

/**
 * Create reusable middleware
 */
export const middleware = t.middleware;

/**
 * Logging middleware - logs all procedure calls
 */
const loggingMiddleware = middleware(async ({ ctx, next, path, type }) => {
  const start = Date.now();
  
  Logger.debug('tRPC Procedure Called', {
    requestId: ctx.requestId,
    path,
    type,
    userId: ctx.user?.id,
  });

  const result = await next();
  
  const duration = Date.now() - start;
  
  if (result.ok) {
    Logger.debug('tRPC Procedure Completed', {
      requestId: ctx.requestId,
      path,
      type,
      duration: `${duration}ms`,
      userId: ctx.user?.id,
    });
  } else {
    Logger.warn('tRPC Procedure Failed', {
      requestId: ctx.requestId,
      path,
      type,
      duration: `${duration}ms`,
      error: result.error.message,
      userId: ctx.user?.id,
    });
  }

  return result;
});

/**
 * Authentication middleware - ensures user is authenticated
 */
const authMiddleware = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    Logger.warn('Unauthorized tRPC access attempt', {
      requestId: ctx.requestId,
      ip: ctx.req.ip,
      userAgent: ctx.req.headers['user-agent'],
    });
    
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  Logger.debug('Authenticated tRPC access', {
    requestId: ctx.requestId,
    userId: ctx.user.id,
    userEmail: ctx.user.email,
  });

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type narrowing - user is guaranteed to exist
    },
  });
});

/**
 * Request timing middleware - tracks request duration
 */
const timingMiddleware = middleware(async ({ ctx, next }) => {
  const result = await next();
  
  const duration = Date.now() - ctx.startTime;
  
  // Add timing header (only if setHeader method exists)
  if (ctx.res && typeof ctx.res.setHeader === 'function') {
    ctx.res.setHeader('X-Response-Time', `${duration}ms`);
  }
  
  // Log slow requests
  if (duration > 1000) {
    Logger.warn('Slow tRPC request detected', {
      requestId: ctx.requestId,
      duration: `${duration}ms`,
      userId: ctx.user?.id,
    });
  }
  
  return result;
});

/**
 * Error handling middleware - converts errors to tRPC errors
 */
const errorHandlingMiddleware = middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    // Convert ApiError to TRPCError
    if (error instanceof ApiError) {
      throw new TRPCError({
        code: getTRPCErrorCode(error.statusCode),
        message: error.message,
        cause: error,
      });
    }

    // Convert ZodError to TRPCError
    if (error instanceof ZodError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Input validation failed',
        cause: error,
      });
    }

    // Handle other errors
    if (error instanceof Error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message,
        cause: error,
      });
    }

    // Unknown error
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unknown error occurred',
      cause: error,
    });
  }
});

/**
 * Convert HTTP status code to tRPC error code
 */
function getTRPCErrorCode(statusCode: number): TRPCError['code'] {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 500:
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

/**
 * Base procedure with logging and error handling
 */
export const baseProcedure = publicProcedure
  .use(timingMiddleware)
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware);

/**
 * OpenAPI-enabled base procedure
 */
export const openApiBaseProcedure = openApiProcedure
  .use(timingMiddleware)
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware);

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = baseProcedure.use(authMiddleware);

/**
 * OpenAPI-enabled protected procedure
 */
export const openApiProtectedProcedure = openApiBaseProcedure.use(authMiddleware);

/**
 * Create the main app router
 * Note: This will be enhanced with file-based routes in the server initialization
 */
export const createAppRouter = (fileBasedRouter?: any) => {
  const baseRoutes = {
    // Health check procedure
    health: openApiBaseProcedure
      .meta(createOpenApiMeta({
        method: 'GET',
        path: '/health',
        summary: 'Health check',
        description: 'Check the health status of the API service',
        tags: ['Health'],
      }))
      .input(z.void())
      .output(z.object({
        status: z.string(),
        timestamp: z.string(),
        requestId: z.string(),
        service: z.string(),
      }))
      .query(async ({ ctx }) => {
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
          service: 'backend-api',
        };
      }),
  };

  // If file-based router is provided, merge it with base routes
  if (fileBasedRouter) {
    return router({
      ...baseRoutes,
      ...fileBasedRouter._def.record,
    });
  }

  // Return base router if no file-based routes
  return router(baseRoutes);
};

// Default app router (will be replaced with file-based routes)
export const appRouter = createAppRouter();

export type AppRouter = typeof appRouter;