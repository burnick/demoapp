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

// Load environment variables
dotenv.config();

const app = express();
const serverConfig = getServerConfig();
const corsConfig = getCORSConfig();
const PORT = serverConfig.port;

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsConfig.origin,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

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

// Health check endpoint (Express route for basic health)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'backend-api',
    version: '1.0.0'
  });
});

// Detailed health check endpoint with service dependencies
app.get('/api/health', async (req, res) => {
  try {
    const { getDatabaseStatus } = await import('./utils/database');
    const { cacheService } = await import('./services/cacheService');
    const { searchService } = await import('./services/searchService');

    const [dbStatus, cacheHealthy, searchHealthy] = await Promise.allSettled([
      getDatabaseStatus(),
      cacheService.isHealthy(),
      searchService.isHealthy()
    ]);

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'backend-api',
      version: '1.0.0',
      dependencies: {
        database: dbStatus.status === 'fulfilled' ? dbStatus.value : { status: 'unhealthy', error: 'Connection failed' },
        cache: cacheHealthy.status === 'fulfilled' ? { status: cacheHealthy.value ? 'healthy' : 'unhealthy' } : { status: 'unhealthy', error: 'Connection failed' },
        search: searchHealthy.status === 'fulfilled' ? { status: searchHealthy.value ? 'healthy' : 'unhealthy' } : { status: 'unhealthy', error: 'Connection failed' }
      }
    };

    // Determine overall health status
    const allHealthy = 
      (dbStatus.status === 'fulfilled' && dbStatus.value.status === 'healthy') &&
      (cacheHealthy.status === 'fulfilled' && cacheHealthy.value) &&
      (searchHealthy.status === 'fulfilled' && searchHealthy.value);

    if (!allHealthy) {
      health.status = 'degraded';
    }

    res.status(allHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'backend-api',
      version: '1.0.0',
      error: 'Health check failed'
    });
  }
});

// Readiness check endpoint
app.get('/api/health/ready', async (req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./prisma/client');
    const isReady = await checkDatabaseHealth();
    
    if (isReady) {
      res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString(), error: 'Database not ready' });
  }
});

// OpenAPI documentation endpoints
app.get('/api/docs/openapi.json', serveOpenApiJson);
app.get('/api/docs/stats', serveOpenApiStats);
app.delete('/api/docs/cache', clearOpenApiCache);

// Swagger UI documentation
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', ...createSwaggerMiddleware());

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