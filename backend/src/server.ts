import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createTRPCMiddleware, updateRouter } from './trpc/server';
import { connectDatabase } from './prisma/client';
import { Logger } from './utils/logger';
import { config, getServerConfig, getCORSConfig } from './utils/config';
import { initializeRoutes, getRouteInfo } from './routes';
import { cacheService } from './services/cacheService';
import { searchService } from './services/searchService';
import { SearchIndexer } from './utils/searchIndexer';
import { 
  createSwaggerMiddleware, 
  serveOpenApiJson, 
  serveOpenApiStats, 
  clearOpenApiCache 
} from './middleware/swagger';
import { logOpenAPIConfig } from './utils/openapi';
import { 
  versioningMiddleware, 
  versionValidationMiddleware, 
  initializeVersionRegistry,
  getVersionInfo 
} from './middleware/versioning';

// Load environment variables
dotenv.config();

const app = express();
const serverConfig = getServerConfig();
const corsConfig = getCORSConfig();
const PORT = serverConfig.port;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: corsConfig.origin,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Initialize version registry and add versioning middleware
initializeVersionRegistry();
app.use(versioningMiddleware());
app.use(versionValidationMiddleware());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    Logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
    });
  });
  
  next();
});

// Import health route handlers
import { getHealth, getReadiness, getLiveness } from './routes/health';

// Health check endpoints
app.get('/api/health', getHealth);
app.get('/api/health/ready', getReadiness);
app.get('/api/health/live', getLiveness);

// Legacy health endpoint for backward compatibility
app.get('/health', getLiveness);

// OpenAPI documentation endpoints
app.get('/api/docs/openapi.json', serveOpenApiJson);
app.get('/api/docs/stats', serveOpenApiStats);
app.delete('/api/docs/cache', clearOpenApiCache);

// Swagger UI documentation
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs/', createSwaggerMiddleware());

// Redirect /api/docs to /api/docs/ (with trailing slash)
app.get('/api/docs', (req, res) => {
  res.redirect(301, '/api/docs/');
});

// Swagger UI debug endpoint
app.get('/api/docs/debug', (req, res) => {
  try {
    const { getCurrentRouter } = require('./trpc/server');
    const { openApiService } = require('./services/openApiService');
    
    const router = getCurrentRouter();
    const document = openApiService.generateDocument(router);
    
    res.json({
      success: true,
      data: {
        swaggerUIStatus: 'enabled',
        documentGenerated: true,
        pathsCount: Object.keys(document.paths || {}).length,
        paths: Object.keys(document.paths || {}),
        info: document.info,
        servers: document.servers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SWAGGER_DEBUG_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Redirect /docs to /api/docs for convenience
app.get('/docs', (req, res) => {
  res.redirect('/api/docs');
});

// Initialize file-based routing and create tRPC middleware
let trpcMiddleware: any;

// Route info endpoint
app.get('/api/routes', (req, res) => {
  try {
    const routeInfo = getRouteInfo();
    res.json({
      success: true,
      data: routeInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ROUTE_INFO_ERROR',
        message: 'Failed to get route information',
      },
    });
  }
});

// Version info endpoint
app.get('/api/versions', (req, res) => {
  try {
    const versionInfo = getVersionInfo();
    res.json({
      success: true,
      data: versionInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'VERSION_INFO_ERROR',
        message: 'Failed to get version information',
      },
    });
  }
});

// Placeholder for tRPC middleware (will be set after route initialization)
app.use('/trpc', (req, res, next) => {
  if (trpcMiddleware) {
    trpcMiddleware(req, res, next);
  } else {
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Routes are still initializing',
      },
    });
  }
});

// 404 handler for non-tRPC routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      path: req.originalUrl,
    },
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Unhandled Express Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Initialize cache service
    Logger.info('Initializing cache service');
    await cacheService.initialize();
    Logger.info('Cache service initialized successfully');
    
    // Initialize search service
    Logger.info('Initializing search service');
    try {
      await searchService.initialize();
      Logger.info('Search service initialized successfully');
      
      // Initialize search index with existing data if needed
      await SearchIndexer.initializeSearchIndex();
    } catch (error) {
      Logger.warn('Search service initialization failed, continuing without search functionality', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    // Initialize file-based routing system
    Logger.info('Initializing file-based routing system');
    const fileBasedRouter = await initializeRoutes();
    
    // Update tRPC router with file-based routes
    const updatedRouter = updateRouter(fileBasedRouter);
    
    // Create tRPC middleware with the updated router
    trpcMiddleware = createTRPCMiddleware(updatedRouter);
    
    // Log OpenAPI configuration
    logOpenAPIConfig();
    
    Logger.info('File-based routing system initialized successfully');
    
    // Start HTTP server
    app.listen(PORT, () => {
      const routeInfo = getRouteInfo();
      
      Logger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: `http://localhost:${PORT}/health`,
          trpc: `http://localhost:${PORT}/trpc`,
          routes: `http://localhost:${PORT}/api/routes`,
          docs: `http://localhost:${PORT}/api/docs`,
          openapi: `http://localhost:${PORT}/api/docs/openapi.json`,
        },
        routing: {
          versions: routeInfo.versions,
          totalRoutes: routeInfo.totalRoutes,
        },
      });
    });
  } catch (error) {
    Logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  Logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Close Redis connection
    const { redisConnection } = await import('./utils/redis');
    await redisConnection.disconnect();
    Logger.info('Redis connection closed');
  } catch (error) {
    Logger.error('Error closing Redis connection:', { error });
  }
  
  try {
    // Close Elasticsearch connection
    const { elasticsearchConnection } = await import('./utils/elasticsearch');
    await elasticsearchConnection.disconnect();
    Logger.info('Elasticsearch connection closed');
  } catch (error) {
    Logger.error('Error closing Elasticsearch connection:', { error });
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default app;