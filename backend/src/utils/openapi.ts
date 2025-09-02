import { OpenApiMeta } from 'trpc-openapi';
import { getServerConfig } from './config';
import { Logger } from './logger';

/**
 * OpenAPI configuration for the tRPC server
 */
export interface OpenAPIConfig {
  title: string;
  version: string;
  description: string;
  servers: Array<{ url: string; description: string }>;
  tags?: Array<{ name: string; description: string }>;
}

/**
 * Get OpenAPI configuration based on environment
 */
export function getOpenAPIConfig(): OpenAPIConfig {
  const serverConfig = getServerConfig();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Determine the base URL based on environment and request context
  let baseUrl: string;
  if (process.env.API_BASE_URL) {
    baseUrl = process.env.API_BASE_URL;
  } else if (isDevelopment) {
    // In development, support multiple hostnames
    baseUrl = `http://burnick.local:${serverConfig.port}`;
  } else {
    baseUrl = `http://localhost:${serverConfig.port}`;
  }

  return {
    title: 'Backend API',
    version: '1.0.0',
    description: `
Modern backend API system built with Node.js, TypeScript, tRPC, Zod, and Prisma.

## Features
- Type-safe API endpoints with tRPC
- Runtime validation with Zod schemas
- Database operations with Prisma ORM
- File-based routing with versioning support
- Redis caching and session management
- Elasticsearch search functionality
- Comprehensive error handling and logging

## Authentication
Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:
\`Authorization: Bearer <your-jwt-token>\`

## Versioning
The API supports multiple versions. Current versions:
- v1: Stable API with core functionality
- v2: Enhanced API with additional features (coming soon)

## Rate Limiting
API requests are rate-limited to prevent abuse. Check response headers for rate limit information.
    `.trim(),
    servers: [
      {
        url: `${baseUrl}/trpc`,
        description: isDevelopment ? 'Development server' : 'Production server',
      },
      // Add localhost as fallback for development
      ...(isDevelopment ? [{
        url: `http://localhost:${serverConfig.port}/trpc`,
        description: 'Development server (localhost)',
      }] : []),
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'Users',
        description: 'User management and profile operations',
      },
      {
        name: 'Search',
        description: 'Search functionality and suggestions',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
  };
}

/**
 * Create OpenAPI meta for tRPC procedures
 */
export function createOpenApiMeta(config: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description?: string;
  tags?: string[];
  protect?: boolean;
  deprecated?: boolean;
}): OpenApiMeta {
  const { method, path, summary, description, tags = [], protect = false, deprecated = false } = config;

  // Ensure path starts with /
  const formattedPath = path.startsWith('/') ? path as `/${string}` : `/${path}` as `/${string}`;

  const meta: OpenApiMeta = {
    openapi: {
      method,
      path: formattedPath,
      summary,
      description: description || summary,
      tags,
      deprecated,
      protect,
    },
  };

  return meta;
}

/**
 * Common OpenAPI responses for reuse
 */
export const commonResponses = {
  400: {
    description: 'Bad Request - Invalid input data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Input validation failed' },
                details: { type: 'object' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNAUTHORIZED' },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'FORBIDDEN' },
                message: { type: 'string', example: 'Insufficient permissions' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  404: {
    description: 'Not Found - Resource not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Resource not found' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INTERNAL_SERVER_ERROR' },
                message: { type: 'string', example: 'Internal server error' },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
};

/**
 * Log OpenAPI configuration for debugging
 */
export function logOpenAPIConfig() {
  const config = getOpenAPIConfig();
  Logger.info('OpenAPI configuration loaded', {
    title: config.title,
    version: config.version,
    servers: config.servers,
    tags: config.tags?.map(tag => tag.name),
  });
}