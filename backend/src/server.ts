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
// Configure Helmet - disable CSP in development to avoid HTTPS upgrade issues
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  // Disable HSTS in development to prevent HTTPS enforcement
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
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

// Swagger UI static assets middleware with protocol handling
app.use('/api/docs', (req, res, next) => {
  // Force HTTP protocol for static assets in development
  if (process.env.NODE_ENV !== 'production' && req.secure) {
    const httpUrl = `http://${req.get('host')}${req.originalUrl}`;
    Logger.debug('Redirecting HTTPS Swagger request to HTTP', {
      originalUrl: req.originalUrl,
      redirectTo: httpUrl,
    });
    return res.redirect(301, httpUrl);
  }
  
  // Add cache-busting headers for development
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
}, swaggerUi.serve);

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

// Simple test page to verify Swagger UI is working
app.get('/test', (req, res) => {
  const protocol = req.secure ? 'https' : 'http';
  const host = req.get('host');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Swagger UI Test - Fixed HTTPS Issue</title>
    </head>
    <body>
      <h1>🎉 Swagger UI - HTTPS Issue Fixed!</h1>
      <p>The HTTPS/HTTP protocol issue has been resolved.</p>
      <p><strong>Current Protocol:</strong> ${protocol}</p>
      <p><strong>Current Host:</strong> ${host}</p>
      
      <h2>✅ Working Swagger UI Links</h2>
      <ul>
        <li><strong><a href="http://${host}/docs/" target="_blank">📖 Swagger UI Documentation (NEW PATH)</a></strong></li>
        <li><a href="http://${host}/api/docs/openapi.json" target="_blank">📄 OpenAPI JSON Specification</a></li>
        <li><a href="http://${host}/api/docs/debug" target="_blank">🔍 Debug Information</a></li>
        <li><a href="http://${host}/health" target="_blank">❤️ Health Check</a></li>
      </ul>
      
      <h2>🔧 What Was Fixed</h2>
      <ul>
        <li>✅ Disabled Content Security Policy in development</li>
        <li>✅ Disabled HSTS (HTTP Strict Transport Security)</li>
        <li>✅ Created alternative path at <code>/docs/</code> to bypass browser HTTPS caching</li>
        <li>✅ Dynamic protocol detection for OpenAPI server URLs</li>
        <li>✅ Added cache-busting headers for development</li>
      </ul>
      
      <h2>📋 Available API Endpoints</h2>
      <div id="endpoints">Loading...</div>
      
      <h2>🧪 Quick Test</h2>
      <button onclick="testSwaggerUI()" style="padding: 10px 20px; background: #49cc90; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Swagger UI</button>
      <div id="result" style="margin-top: 10px;"></div>
      
      <script>
        // Load endpoints on page load
        fetch('http://${host}/api/docs/openapi.json')
          .then(response => response.json())
          .then(data => {
            const endpointsDiv = document.getElementById('endpoints');
            const paths = Object.keys(data.paths || {});
            endpointsDiv.innerHTML = \`
              <ul>
                \${paths.map(path => \`<li><code>\${path}</code></li>\`).join('')}
              </ul>
              <p><strong>Total Endpoints:</strong> \${paths.length}</p>
            \`;
          })
          .catch(error => {
            document.getElementById('endpoints').innerHTML = \`<p style="color: red;">Error loading endpoints: \${error.message}</p>\`;
          });
        
        function testSwaggerUI() {
          const result = document.getElementById('result');
          result.innerHTML = '<p style="color: blue;">Testing Swagger UI...</p>';
          
          fetch('http://${host}/api/docs/openapi.json')
            .then(response => response.json())
            .then(data => {
              result.innerHTML = \`
                <div style="background: #f0f8f0; padding: 15px; border-radius: 4px; border-left: 4px solid #49cc90;">
                  <h3 style="color: #2d5a2d; margin-top: 0;">✅ Swagger UI Test Successful!</h3>
                  <p><strong>API Title:</strong> \${data.info.title}</p>
                  <p><strong>Version:</strong> \${data.info.version}</p>
                  <p><strong>Endpoints:</strong> \${Object.keys(data.paths || {}).length}</p>
                  <p><strong>Server URLs:</strong></p>
                  <ul>\${data.servers.map(server => \`<li>\${server.url} - \${server.description}</li>\`).join('')}</ul>
                  <p><strong><a href="http://${host}/docs/" target="_blank" style="color: #49cc90;">🚀 Open Swagger UI Now!</a></strong></p>
                </div>
              \`;
            })
            .catch(error => {
              result.innerHTML = \`
                <div style="background: #f8f0f0; padding: 15px; border-radius: 4px; border-left: 4px solid #cc4949;">
                  <h3 style="color: #5a2d2d; margin-top: 0;">❌ Test Failed</h3>
                  <p>Error: \${error.message}</p>
                </div>
              \`;
            });
        }
      </script>
    </body>
    </html>
  `);
});

// Alternative Swagger UI path to bypass HTTPS caching issues
app.use('/docs', (req, res, next) => {
  // Skip middleware for the redirect route
  if (req.path === '/docs' && !req.path.endsWith('/')) {
    return next();
  }
  
  // Ensure no HTTPS upgrade for this path
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, swaggerUi.serve);

app.get('/docs/', createSwaggerMiddleware());

// Redirect /docs to /docs/ (with trailing slash)
app.get('/docs', (req, res) => {
  res.redirect(301, '/docs/');
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