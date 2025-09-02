# tRPC Server Foundation

This directory contains the tRPC server foundation implementation, providing type-safe API development with comprehensive middleware support.

## Components

### 1. Context (`context.ts`)
- Creates request context for all tRPC procedures
- Handles JWT authentication extraction
- Provides Prisma client access
- Generates unique request IDs for tracing
- Includes helper functions for authentication requirements

### 2. Router (`router.ts`)
- Initializes tRPC with custom error formatting
- Defines base procedures with middleware stack
- Implements authentication, logging, timing, and error handling middleware
- Provides public and protected procedure builders
- Includes a health check procedure

### 3. Server (`server.ts`)
- Creates Express middleware for tRPC integration
- Handles error logging and reporting
- Exports router types for client usage

### 4. Index (`index.ts`)
- Exports all public tRPC components
- Provides clean API for importing tRPC functionality

## Middleware Stack

### 1. Timing Middleware
- Tracks request duration
- Adds `X-Response-Time` header to responses
- Logs slow requests (>1000ms) as warnings

### 2. Logging Middleware
- Logs all procedure calls with context
- Includes request ID, user ID, and timing information
- Differentiates between successful and failed procedures

### 3. Error Handling Middleware
- Converts custom errors to tRPC errors
- Handles Zod validation errors
- Provides consistent error formatting
- Maps HTTP status codes to tRPC error codes

### 4. Authentication Middleware
- Validates JWT tokens from Authorization header
- Ensures user authentication for protected procedures
- Logs authentication attempts and failures

## Usage Examples

### Creating a Public Procedure
```typescript
import { baseProcedure } from '../trpc';
import { z } from 'zod';

export const getPublicData = baseProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    // Access Prisma client via ctx.prisma
    // No authentication required
    return { data: 'public data' };
  });
```

### Creating a Protected Procedure
```typescript
import { protectedProcedure } from '../trpc';
import { z } from 'zod';

export const getUserData = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    // ctx.user is guaranteed to exist
    // Access user ID via ctx.user.id
    return { userId: ctx.user.id };
  });
```

### Adding to Router
```typescript
import { router } from '../trpc';
import { getPublicData, getUserData } from './procedures';

export const myRouter = router({
  getPublicData,
  getUserData,
});
```

## Error Handling

The system automatically handles various error types:

- **Validation Errors**: Zod schema validation failures
- **Authentication Errors**: Missing or invalid JWT tokens
- **Authorization Errors**: Insufficient permissions
- **Database Errors**: Prisma operation failures
- **Custom API Errors**: Application-specific errors

All errors are logged with appropriate context and converted to consistent tRPC error responses.

## Testing

The tRPC foundation includes comprehensive tests:

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end procedure execution
- **Middleware Tests**: Middleware functionality verification
- **Error Handling Tests**: Error conversion and formatting

Run tests with:
```bash
npm test -- --testPathPattern=trpc
```

## Configuration

The tRPC server uses configuration from `utils/config.ts`:

- **JWT_SECRET**: Secret key for JWT token verification
- **JWT_EXPIRES_IN**: Token expiration time
- **LOG_LEVEL**: Logging verbosity level
- **CORS_ORIGIN**: Allowed CORS origins

## Integration with Express

The tRPC server integrates with Express via middleware:

```typescript
import { trpcMiddleware } from './trpc/server';

app.use('/trpc', trpcMiddleware);
```

This makes all tRPC procedures available at `/trpc/*` endpoints.