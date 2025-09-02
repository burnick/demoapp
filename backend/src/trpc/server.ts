import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter, createAppRouter } from './router';
import { createContext } from './context';
import { Logger } from '../utils/logger';

// Global variable to hold the current router
let currentRouter = appRouter;

/**
 * Create tRPC Express middleware with dynamic router support
 */
export const createTRPCMiddleware = (router?: any) => {
  const routerToUse = router || currentRouter;
  
  return createExpressMiddleware({
    router: routerToUse,
    createContext,
    onError: ({ error, path, input, ctx }) => {
      // Enhanced error logging for tRPC
      Logger.error('tRPC Error Handler', {
        requestId: ctx?.requestId,
        path,
        input: process.env.NODE_ENV === 'development' ? input : '[REDACTED]',
        error: {
          code: error.code,
          message: error.message,
          cause: error.cause,
          stack: error.stack,
        },
        userId: ctx?.user?.id,
      });
    },
  });
};

/**
 * Update the current router (used for file-based routing)
 */
export const updateRouter = (fileBasedRouter: any) => {
  currentRouter = createAppRouter(fileBasedRouter);
  Logger.info('tRPC router updated with file-based routes');
  return currentRouter;
};

/**
 * Get the current router
 */
export const getCurrentRouter = () => currentRouter;

/**
 * Default tRPC middleware (will be replaced with file-based routes)
 */
export const trpcMiddleware = createTRPCMiddleware();

/**
 * Export router type for client
 */
export type { AppRouter } from './router';