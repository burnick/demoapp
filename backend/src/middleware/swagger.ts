import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiService } from '../services/openApiService';
import { getCurrentRouter } from '../trpc/server';
import { Logger } from '../utils/logger';
import { getOpenAPIConfig } from '../utils/openapi';

/**
 * Swagger UI configuration options
 */
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
    tryItOutEnabled: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    operationsSorter: 'alpha',
    tagsSorter: 'alpha',
    deepLinking: true,
    displayOperationId: false,
    showMutatedRequest: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b4151; }
    .swagger-ui .scheme-container { background: #f7f7f7; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .swagger-ui .auth-wrapper { margin: 20px 0; }
    .swagger-ui .btn.authorize { background-color: #49cc90; border-color: #49cc90; }
    .swagger-ui .btn.authorize:hover { background-color: #41b883; border-color: #41b883; }
  `,
  customSiteTitle: 'Backend API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * Generate OpenAPI document middleware
 */
export const generateOpenApiDocument = (req: Request, res: Response, next: NextFunction) => {
  try {
    const router = getCurrentRouter();
    const document = openApiService.generateDocument(router);
    
    // Add request info to response headers
    res.setHeader('X-Generated-At', new Date().toISOString());
    res.setHeader('X-Document-Version', document.info.version);
    
    // Store document in request for use by Swagger UI
    (req as any).swaggerDoc = document;
    
    Logger.debug('OpenAPI document generated for Swagger UI', {
      paths: Object.keys(document.paths || {}).length,
      version: document.info.version,
      requestId: (req as any).requestId,
    });
    
    next();
  } catch (error) {
    Logger.error('Failed to generate OpenAPI document for Swagger UI', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: (req as any).requestId,
    });
    
    // Return minimal document on error
    const config = getOpenAPIConfig();
    (req as any).swaggerDoc = {
      openapi: '3.0.3',
      info: {
        title: config.title,
        version: config.version,
        description: 'API documentation is temporarily unavailable',
      },
      servers: config.servers,
      paths: {},
    };
    
    next();
  }
};

/**
 * Create Swagger UI middleware with dynamic document generation
 */
export const createSwaggerMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const router = getCurrentRouter();
      const document = openApiService.generateDocument(router);
      
      // Update server URLs based on the current request
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host') || 'localhost:3000';
      const currentServerUrl = `${protocol}://${host}/trpc`;
      
      // Update the document with the current server URL
      const updatedDocument = {
        ...document,
        servers: [
          {
            url: currentServerUrl,
            description: 'Current server',
          },
          ...document.servers.filter(server => server.url !== currentServerUrl),
        ],
      };
      
      Logger.debug('Serving Swagger UI with document', {
        paths: Object.keys(updatedDocument.paths || {}).length,
        version: updatedDocument.info.version,
        serverUrl: currentServerUrl,
        host: host,
      });
      
      // Create Swagger UI middleware with the updated document
      const swaggerMiddleware = swaggerUi.setup(updatedDocument, swaggerOptions);
      swaggerMiddleware(req, res, next);
    } catch (error) {
      Logger.error('Failed to create Swagger UI middleware', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Fallback to basic document with current host
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host') || 'localhost:3000';
      const fallbackDoc = {
        openapi: '3.0.3',
        info: {
          title: 'Backend API',
          version: '1.0.0',
          description: 'API documentation is temporarily unavailable',
        },
        servers: [
          {
            url: `${protocol}://${host}/trpc`,
            description: 'Current server',
          },
        ],
        paths: {},
      };
      
      const swaggerMiddleware = swaggerUi.setup(fallbackDoc, swaggerOptions);
      swaggerMiddleware(req, res, next);
    }
  };
};

/**
 * Serve OpenAPI JSON endpoint
 */
export const serveOpenApiJson = (req: Request, res: Response) => {
  try {
    const router = getCurrentRouter();
    const document = openApiService.generateDocument(router);
    
    // Update server URLs based on the current request
    const protocol = req.secure ? 'https' : 'http';
    const host = req.get('host') || 'localhost:3000';
    const currentServerUrl = `${protocol}://${host}/trpc`;
    
    // Update the document with the current server URL
    const updatedDocument = {
      ...document,
      servers: [
        {
          url: currentServerUrl,
          description: 'Current server',
        },
        ...document.servers.filter(server => server.url !== currentServerUrl),
      ],
    };
    
    // Add response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Generated-At', new Date().toISOString());
    res.setHeader('X-Document-Version', updatedDocument.info.version);
    res.setHeader('X-Server-URL', currentServerUrl);
    
    // Add CORS headers for external tools
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    Logger.info('OpenAPI JSON document served', {
      paths: Object.keys(updatedDocument.paths || {}).length,
      version: updatedDocument.info.version,
      serverUrl: currentServerUrl,
      host: host,
      userAgent: req.headers['user-agent'],
      requestId: (req as any).requestId,
    });
    
    res.json(updatedDocument);
  } catch (error) {
    Logger.error('Failed to serve OpenAPI JSON document', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId: (req as any).requestId,
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'OPENAPI_GENERATION_ERROR',
        message: 'Failed to generate OpenAPI document',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * OpenAPI document statistics endpoint
 */
export const serveOpenApiStats = (req: Request, res: Response) => {
  try {
    const router = getCurrentRouter();
    const document = openApiService.generateDocument(router);
    const stats = openApiService.getDocumentStats(document);
    
    Logger.debug('OpenAPI stats requested', {
      requestId: (req as any).requestId,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error('Failed to get OpenAPI stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: (req as any).requestId,
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'OPENAPI_STATS_ERROR',
        message: 'Failed to get OpenAPI statistics',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Clear OpenAPI cache endpoint (development only)
 */
export const clearOpenApiCache = (req: Request, res: Response): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Cache clearing is not allowed in production',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  try {
    openApiService.clearCache();
    
    Logger.info('OpenAPI cache cleared', {
      requestId: (req as any).requestId,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      data: {
        message: 'OpenAPI cache cleared successfully',
        clearedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    Logger.error('Failed to clear OpenAPI cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: (req as any).requestId,
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_CLEAR_ERROR',
        message: 'Failed to clear OpenAPI cache',
      },
      timestamp: new Date().toISOString(),
    });
  }
};