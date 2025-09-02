import { router } from '../../trpc/router';
import { router as userRouter } from './users';
import { router as authRouter } from './auth';

/**
 * Combined router for API v2
 * Includes all v2 endpoints with enhanced features
 */
export const v2Router = router({
  users: userRouter,
  auth: authRouter,
});

// Export individual routers for direct access
export { userRouter, authRouter };

// Route metadata for v2
export const meta = {
  version: 'v2',
  description: 'API version 2 with enhanced features and improved functionality',
  deprecated: false,
  releaseDate: '2024-12-02',
  features: [
    'Enhanced user management with preferences and metadata',
    'Advanced authentication with MFA and session management',
    'Bulk operations and analytics',
    'Improved search with facets and aggregations',
    'Security event logging and audit trails',
    'Device tracking and risk-based authentication',
    'Enhanced error handling and validation',
    'Comprehensive API documentation',
  ],
  breaking_changes: [
    'User schema includes additional fields (preferences, metadata, tags, status)',
    'Authentication responses include enhanced security information',
    'Pagination responses include navigation metadata (hasNext, hasPrev, totalPages)',
    'Error responses include more detailed error information',
  ],
  migration_guide: {
    from_v1: {
      users: {
        'GET /v1/users': 'GET /v2/users - Response includes enhanced user data',
        'POST /v1/users': 'POST /v2/users - Request can include preferences and metadata',
        'PUT /v1/users/{id}': 'PUT /v2/users/{id} - Request can include enhanced fields',
      },
      auth: {
        'POST /v1/auth/register': 'POST /v2/auth/register - Request can include preferences',
        'POST /v1/auth/login': 'POST /v2/auth/login - Response includes session and security info',
        'GET /v1/auth/session': 'GET /v2/auth/session - Response includes enhanced session data',
      },
    },
  },
};