import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { createTRPCMiddleware, updateRouter } from './trpc/server';
import { connectDatabase } from './prisma/client';
import { Logger } from './utils/logger';
import { config, getServerConfig, getCORSConfig } from './utils/config';
import { initializeRoutes, getRouteInfo } from './routes';

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
    
    // Initialize file-based routing system
    Logger.info('Initializing file-based routing system');
    const fileBasedRouter = await initializeRoutes();
    
    // Update tRPC router with file-based routes
    const updatedRouter = updateRouter(fileBasedRouter);
    
    // Create tRPC middleware with the updated router
    trpcMiddleware = createTRPCMiddleware(updatedRouter);
    
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
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

export default app;