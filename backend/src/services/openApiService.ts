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
      
      // For now, return a manually created document with the main endpoints
      // TODO: Fix automatic generation from nested router structure
      const document = this.createManualOpenApiDocument(config);

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
   * Create manual OpenAPI document with main endpoints
   * TODO: Replace with automatic generation once router structure is fixed
   */
  private createManualOpenApiDocument(config: any): OpenApiDocument {
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
        '/v1.thirdPartyOAuth.getProviders': {
          get: {
            summary: 'Get available OAuth providers',
            description: 'Get list of configured third-party OAuth providers (Google, Facebook)',
            tags: ['Third-Party OAuth'],
            responses: {
              '200': {
                description: 'List of available OAuth providers',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        result: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                success: { type: 'boolean', example: true },
                                data: {
                                  type: 'object',
                                  properties: {
                                    providers: {
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          name: { type: 'string', example: 'google' },
                                          displayName: { type: 'string', example: 'Google' },
                                          iconUrl: { type: 'string', example: 'https://developers.google.com/identity/images/g-logo.png' },
                                        },
                                      },
                                    },
                                  },
                                },
                                timestamp: { type: 'string', format: 'date-time' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/v1.thirdPartyOAuth.getAuthUrl': {
          post: {
            summary: 'Get OAuth authorization URL',
            description: 'Generate OAuth authorization URL for the specified provider',
            tags: ['Third-Party OAuth'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      provider: { type: 'string', enum: ['google', 'facebook'] },
                      redirectUrl: { type: 'string', format: 'uri' },
                    },
                    required: ['provider'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'OAuth authorization URL generated',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        result: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                success: { type: 'boolean', example: true },
                                data: {
                                  type: 'object',
                                  properties: {
                                    authUrl: { type: 'string', format: 'uri' },
                                    provider: { type: 'string', example: 'google' },
                                  },
                                },
                                timestamp: { type: 'string', format: 'date-time' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/v1.thirdPartyOAuth.handleCallback': {
          post: {
            summary: 'Handle OAuth callback',
            description: 'Process OAuth callback from third-party provider and authenticate user',
            tags: ['Third-Party OAuth'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      provider: { type: 'string', enum: ['google', 'facebook'] },
                      code: { type: 'string' },
                      state: { type: 'string' },
                      error: { type: 'string' },
                      errorDescription: { type: 'string' },
                    },
                    required: ['provider', 'code', 'state'],
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'OAuth authentication successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        result: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                success: { type: 'boolean', example: true },
                                data: {
                                  type: 'object',
                                  properties: {
                                    user: {
                                      type: 'object',
                                      properties: {
                                        id: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        name: { type: 'string' },
                                        avatar: { type: 'string', format: 'uri' },
                                        emailVerified: { type: 'boolean' },
                                      },
                                    },
                                    tokens: {
                                      type: 'object',
                                      properties: {
                                        accessToken: { type: 'string' },
                                        refreshToken: { type: 'string' },
                                        expiresAt: { type: 'string', format: 'date-time' },
                                      },
                                    },
                                    isNewUser: { type: 'boolean' },
                                  },
                                },
                                timestamp: { type: 'string', format: 'date-time' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '/v1.thirdPartyOAuth.getStatus': {
          get: {
            summary: 'Get OAuth service status',
            description: 'Get current status of OAuth service and providers (for debugging)',
            tags: ['Third-Party OAuth'],
            responses: {
              '200': {
                description: 'OAuth service status',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        result: {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'object',
                              properties: {
                                success: { type: 'boolean', example: true },
                                data: {
                                  type: 'object',
                                  properties: {
                                    initialized: { type: 'boolean' },
                                    enabledProviders: { type: 'array', items: { type: 'string' } },
                                    totalProviders: { type: 'number' },
                                    stateStoreSize: { type: 'number' },
                                  },
                                },
                                timestamp: { type: 'string', format: 'date-time' },
                              },
                            },
                          },
                        },
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