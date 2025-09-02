# OpenAPI Documentation

This document explains how the OpenAPI documentation generation is implemented and how to use it.

## Overview

The backend API automatically generates OpenAPI 3.0 specification from tRPC procedures using Zod schemas. This provides interactive documentation via Swagger UI and enables integration with standard OpenAPI tooling.

## Features

- **Automatic Generation**: OpenAPI spec is generated from tRPC procedures and Zod schemas
- **Interactive Documentation**: Swagger UI provides a web interface for exploring and testing the API
- **Type Safety**: Full type safety from Zod schemas to OpenAPI specification
- **Caching**: Generated documents are cached for performance
- **Error Handling**: Graceful fallback when generation fails
- **Development Tools**: Cache clearing and statistics endpoints

## Endpoints

### Documentation Endpoints

- **`GET /api/docs`** - Interactive Swagger UI documentation
- **`GET /docs`** - Redirects to `/api/docs` for convenience
- **`GET /api/docs/openapi.json`** - Raw OpenAPI JSON specification
- **`GET /api/docs/stats`** - OpenAPI document statistics
- **`DELETE /api/docs/cache`** - Clear OpenAPI cache (development only)

### Example Usage

```bash
# View interactive documentation
curl http://localhost:3000/api/docs

# Get OpenAPI JSON specification
curl http://localhost:3000/api/docs/openapi.json

# Get document statistics
curl http://localhost:3000/api/docs/stats

# Clear cache (development only)
curl -X DELETE http://localhost:3000/api/docs/cache
```

## Implementation Details

### Core Components

1. **OpenAPI Service** (`src/services/openApiService.ts`)
   - Generates OpenAPI documents from tRPC routers
   - Handles caching and error recovery
   - Provides document statistics

2. **OpenAPI Utilities** (`src/utils/openapi.ts`)
   - Configuration management
   - OpenAPI meta creation helpers
   - Common response schemas

3. **Swagger Middleware** (`src/middleware/swagger.ts`)
   - Express middleware for serving documentation
   - Dynamic document generation
   - Error handling for HTTP endpoints

### Adding OpenAPI Meta to Procedures

Use the `createOpenApiMeta` helper to add OpenAPI metadata to tRPC procedures:

```typescript
import { createOpenApiMeta } from '../utils/openapi';

const userRouter = trpcRouter({
  getUser: baseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/{id}',
      summary: 'Get user by ID',
      description: 'Retrieve a specific user by their unique identifier',
      tags: ['Users'],
      protect: false, // Set to true for protected endpoints
    }))
    .input(z.object({
      id: z.string().uuid(),
    }))
    .output(UserSchema)
    .query(async ({ input }) => {
      // Implementation
    }),
});
```

### Required Schemas

For OpenAPI generation to work properly, tRPC procedures must have:

1. **Input Schema**: Zod schema for input validation
2. **Output Schema**: Zod schema for response validation
3. **OpenAPI Meta**: Metadata for HTTP method, path, and documentation

```typescript
// Example with all required parts
const procedure = baseProcedure
  .meta(createOpenApiMeta({
    method: 'POST',
    path: '/api/example',
    summary: 'Example endpoint',
    tags: ['Example'],
  }))
  .input(z.object({
    name: z.string(),
    email: z.string().email(),
  }))
  .output(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }))
  .mutation(async ({ input }) => {
    // Implementation
  });
```

## Configuration

### Environment Variables

- **`NODE_ENV`**: Controls cache clearing permissions (production blocks cache clearing)
- **`API_BASE_URL`**: Base URL for the API server (used in OpenAPI servers)
- **`PORT`**: Server port (used in server URL generation)

### OpenAPI Configuration

The OpenAPI configuration is managed in `src/utils/openapi.ts`:

```typescript
export function getOpenAPIConfig(): OpenAPIConfig {
  return {
    title: 'Backend API',
    version: '1.0.0',
    description: 'Modern backend API system...',
    servers: [
      {
        url: `${baseUrl}/trpc`,
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication...' },
      { name: 'Users', description: 'User management...' },
      // ...
    ],
  };
}
```

## Security

### Authentication

The OpenAPI specification includes JWT bearer token authentication:

```json
{
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token for authentication. Include as: Bearer <token>"
      }
    }
  }
}
```

### Protected Endpoints

Mark endpoints as protected using the `protect: true` option in OpenAPI meta:

```typescript
.meta(createOpenApiMeta({
  method: 'POST',
  path: '/api/protected',
  summary: 'Protected endpoint',
  protect: true, // Requires authentication
}))
```

## Error Handling

The system includes comprehensive error handling:

1. **Generation Errors**: Falls back to minimal document if generation fails
2. **HTTP Errors**: Returns proper error responses with status codes
3. **Validation Errors**: Handles missing or invalid schemas gracefully

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "OPENAPI_GENERATION_ERROR",
    "message": "Failed to generate OpenAPI document"
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Performance

### Caching

- Generated documents are cached for 5 minutes
- Cache can be cleared manually in development
- Cache statistics are available via `/api/docs/stats`

### Optimization

- Documents are generated on-demand
- Minimal fallback document for error cases
- Efficient schema processing

## Testing

The OpenAPI functionality includes comprehensive tests:

- **Unit Tests**: Service and utility functions
- **Integration Tests**: HTTP endpoints and middleware
- **Error Handling**: Graceful degradation scenarios

Run OpenAPI tests:

```bash
npm test -- --testNamePattern="openapi"
```

## Troubleshooting

### Common Issues

1. **Missing Input/Output Schemas**: Ensure all procedures have Zod input and output schemas
2. **Invalid OpenAPI Meta**: Check that paths start with `/` and methods are valid HTTP methods
3. **Generation Failures**: Check logs for specific error messages

### Debug Information

Enable debug logging to see OpenAPI generation details:

```bash
DEBUG=openapi npm run dev
```

### Cache Issues

Clear the OpenAPI cache if you see stale documentation:

```bash
curl -X DELETE http://localhost:3000/api/docs/cache
```

## Best Practices

1. **Consistent Schemas**: Use shared Zod schemas for consistent validation
2. **Descriptive Metadata**: Provide clear summaries and descriptions
3. **Proper Tagging**: Group related endpoints with consistent tags
4. **Error Responses**: Document expected error responses
5. **Authentication**: Mark protected endpoints appropriately

## Integration with External Tools

The generated OpenAPI specification can be used with:

- **Postman**: Import the OpenAPI JSON for API testing
- **Insomnia**: Use the specification for request generation
- **Code Generators**: Generate client SDKs from the specification
- **API Gateways**: Configure routing and validation rules

Example import URL: `http://localhost:3000/api/docs/openapi.json`