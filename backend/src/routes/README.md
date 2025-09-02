# File-based Routing System

This directory contains the file-based routing system for the backend API. The system automatically discovers and loads route files, organizing them by version and creating a combined tRPC router.

## Directory Structure

```
src/routes/
├── index.ts              # Main routing initialization
├── v1/                   # Version 1 routes
│   ├── index.ts         # V1 router combination
│   ├── auth.ts          # Authentication endpoints
│   └── users.ts         # User management endpoints
└── v2/                   # Version 2 routes (future)
    └── ...
```

## How It Works

### 1. Route Discovery
The system automatically scans the `routes` directory and discovers all TypeScript files:
- Ignores `index.ts` files (used for combining routes)
- Detects version directories (e.g., `v1`, `v2`)
- Loads route modules dynamically

### 2. Version Organization
Routes are automatically organized by version:
- Files in `v1/` directory are grouped under version `v1`
- Each version gets its own router with prefix `/v1`, `/v2`, etc.
- Supports multiple versions simultaneously

### 3. Automatic Registration
- Route files are automatically registered with the main tRPC router
- No manual registration required - just create a file and export a router
- Hot reloading support in development mode

## Creating New Routes

### Route File Structure
Each route file should export:
- `router`: The tRPC router with procedures
- `meta`: Optional metadata about the route

```typescript
// Example: src/routes/v1/example.ts
import { z } from 'zod';
import { router as trpcRouter, baseProcedure, protectedProcedure } from '../../trpc/router';

export const exampleRouter = trpcRouter({
  // Define your procedures here
  hello: baseProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello, ${input.name}!` };
    }),
});

// Export the router
export const router = exampleRouter;

// Route metadata
export const meta = {
  version: 'v1',
  description: 'Example endpoints',
  deprecated: false,
};
```

### Adding New Versions
To add a new API version:
1. Create a new directory (e.g., `v2/`)
2. Add route files in the new directory
3. The system will automatically detect and register them

## API Endpoints

### Current Endpoints (v1)

#### Authentication (`/trpc/v1.auth.*`)
- `register` - User registration
- `login` - User login
- `logout` - User logout (protected)
- `refreshToken` - Refresh access token
- `changePassword` - Change password (protected)
- `forgotPassword` - Request password reset
- `resetPassword` - Reset password with token
- `verifyEmail` - Verify email address
- `getSession` - Get current session info (protected)

#### Users (`/trpc/v1.users.*`)
- `getUsers` - Get paginated list of users
- `getUserById` - Get user by ID
- `createUser` - Create new user (protected)
- `updateUser` - Update user (protected)
- `deleteUser` - Delete user (protected)
- `getProfile` - Get current user profile (protected)
- `updateProfile` - Update current user profile (protected)

## Route Information Endpoint

The system provides a route information endpoint at `/api/routes` that returns:
- Available versions
- Total number of routes
- Route details by version
- Deprecation information

## Features

### Version Support
- Multiple API versions can coexist
- Version-specific routing with prefixes
- Deprecation warnings and metadata

### Automatic Discovery
- No manual route registration required
- Supports nested directory structures
- Hot reloading in development

### Type Safety
- Full TypeScript support
- tRPC type safety maintained
- Zod schema validation

### Error Handling
- Centralized error handling
- Proper HTTP status codes
- Structured error responses

### Metadata Support
- Route descriptions
- Deprecation information
- Version information

## Development

### Testing
Run the routing system tests:
```bash
npm test -- routing.test.ts
npm test -- file-routing-integration.test.ts
```

### Adding Routes
1. Create a new `.ts` file in the appropriate version directory
2. Export a `router` and optional `meta`
3. The system will automatically discover and register it
4. Restart the server to see changes (or use hot reload in development)

### Debugging
The system provides detailed logging:
- Route discovery process
- File loading status
- Router registration
- Error information

Check the server logs for routing system information during startup.