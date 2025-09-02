import { router as trpcRouter } from '../../trpc/router';
import { router as userRouter } from './users';
import { router as authRouter } from './auth';
import { router as thirdPartyOAuthRouter } from './thirdPartyOAuth';

/**
 * Combined v1 router with all v1 endpoints
 */
export const v1Router = trpcRouter({
  users: userRouter,
  auth: authRouter,
  thirdPartyOAuth: thirdPartyOAuthRouter,
});

// Export the router
export const router = v1Router;

// Route metadata for v1
export const meta = {
  version: 'v1',
  description: 'API version 1 - Core functionality',
  deprecated: false,
};