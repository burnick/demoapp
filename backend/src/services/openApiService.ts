import { generateOpenApiDocument } from 'trpc-openapi';
import type { OpenAPIV3 } from 'openapi-types';
import { getOpenAPIConfig } from '../utils/openapi';
import { Logger } from '../utils/logger';
import type { AppRouter } from '../trpc/router';

// Use the correct OpenAPI document type
type OpenApiDocument = OpenAPIV3.Document;

/**
 * OpenAPI service for generating and managing OpenAPI specifications
 */
export class OpenApiService {
  private static instance: OpenApiService;
  private cachedDocument: OpenApiDocument | null = null;
  private lastGenerated: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): OpenApiService {
    if (!OpenApiService.instance) {
      OpenApiService.instance = new OpenApiService();
    }
    return OpenApiService.instance;
  }

  /**
   * Generate OpenAPI document from tRPC router
   */
  public generateDocument(router: AppRouter): OpenApiDocument {
    try {
      const now = Date.now();
      
      // Return cached document if still valid
      if (this.cachedDocument && (now - this.lastGenerated) < this.CACHE_TTL) {
        Logger.debug('Returning cached OpenAPI document');
        return this.cachedDocument;
      }

      Logger.info('Generating OpenAPI document from tRPC router');
      
      const config = getOpenAPIConfig();
      
      // Create a flattened router for OpenAPI generation
      const flattenedRouter = this.createFlattenedRouter(router);
      
      const document = generateOpenApiDocument(flattenedRouter, {
        title: config.title,
        version: config.version,
        description: config.description,
        baseUrl: config.servers[0]?.url || 'http://localhost:3000/trpc',
        tags: config.tags?.map(tag => tag.name) || [],
        docsUrl: '/api/docs',
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication. Include as: Bearer <token>',
          },
        },
      });

      // Add servers and tags with descriptions manually
      document.servers = config.servers;
      if (config.tags) {
        document.tags = config.tags;
      }

      // Note: Default responses are handled by the trpc-openapi library
      /* 
        defaultResponses: {
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
        }
      */

      // Cache the generated document
      this.cachedDocument = document;
      this.lastGenerated = now;

      Logger.info('OpenAPI document generated successfully', {
        paths: Object.keys(document.paths || {}).length,
        components: Object.keys(document.components?.schemas || {}).length,
        tags: document.tags?.length || 0,
      });

      return document;
    } catch (error) {
      Logger.error('Failed to generate OpenAPI document', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Return a minimal document on error
      return this.getMinimalDocument();
    }
  }

  /**
   * Create a flattened router for OpenAPI generation
   * This extracts all procedures from nested routers and creates a flat structure
   */
  private createFlattenedRouter(router: AppRouter): any {
    const { router: trpcRouter } = require('../trpc/router');
    const flatRoutes: Record<string, any> = {};
    
    try {
      // Extract procedures from the router
      const routerDef = router._def;
      
      if (routerDef && routerDef.record) {
        this.extractProceduresFromRecord(routerDef.record, flatRoutes, '');
      }
      
      Logger.debug('Created flattened router for OpenAPI', {
        procedureCount: Object.keys(flatRoutes).length,
        procedures: Object.keys(flatRoutes),
      });
      
      return trpcRouter(flatRoutes);
    } catch (error) {
      Logger.error('Failed to create flattened router', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Return empty router on error
      return trpcRouter({});
    }
  }

  /**
   * Recursively extract procedures from router record
   */
  private extractProceduresFromRecord(record: any, flatRoutes: Record<string, any>, prefix: string): void {
    for (const [key, value] of Object.entries(record)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object') {
        // Check if this is a procedure (has _def with type)
        if (value._def && (value._def.type === 'query' || value._def.type === 'mutation')) {
          flatRoutes[fullKey] = value;
        }
        // Check if this is a nested router
        else if (value._def && value._def.record) {
          this.extractProceduresFromRecord(value._def.record, flatRoutes, fullKey);
        }
        // Check if this has procedures directly
        else if (value._def) {
          flatRoutes[fullKey] = value;
        }
      }
    }
  }

  /**
   * Get minimal OpenAPI document for fallback
   */
  private getMinimalDocument(): OpenApiDocument {
    const config = getOpenAPIConfig();
    
    return {
      openapi: '3.0.3',
      info: {
        title: config.title,
        version: config.version,
        description: config.description,
      },
      servers: config.servers,
      paths: {
        '/health': {
          get: {
            summary: 'Health check endpoint',
            description: 'Check the health status of the API',
            tags: ['Health'],
            responses: {
              '200': {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'ok' },
                        timestamp: { type: 'string', format: 'date-time' },
                        service: { type: 'string', example: 'backend-api' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication',
          },
        },
      },
      tags: config.tags || [],
    };
  }

  /**
   * Clear cached document (useful for development)
   */
  public clearCache(): void {
    this.cachedDocument = null;
    this.lastGenerated = 0;
    Logger.debug('OpenAPI document cache cleared');
  }

  /**
   * Get document statistics
   */
  public getDocumentStats(document: OpenApiDocument) {
    return {
      paths: Object.keys(document.paths || {}).length,
      schemas: Object.keys(document.components?.schemas || {}).length,
      tags: document.tags?.length || 0,
      servers: document.servers?.length || 0,
      lastGenerated: new Date(this.lastGenerated).toISOString(),
      isCached: this.cachedDocument !== null,
    };
  }
}

// Export singleton instance
export const openApiService = OpenApiService.getInstance();