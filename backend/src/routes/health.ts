import { Request, Response } from 'express';
import { healthService } from '../services/healthService';
import { logger } from '../utils/logger';

/**
 * Basic health check endpoint
 * GET /api/health
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthStatus = await healthService.getDetailedHealth();
    
    // Set appropriate HTTP status code based on health status
    let statusCode: number;
    switch (healthStatus.status) {
      case 'healthy':
        statusCode = 200;
        break;
      case 'degraded':
        statusCode = 200; // Still operational, but with issues
        break;
      case 'unhealthy':
        statusCode = 503; // Service unavailable
        break;
      default:
        statusCode = 503;
    }

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check endpoint failed', { error });
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'backend-api',
      version: '1.0.0',
      uptime: 0,
      error: 'Health check failed',
    });
  }
};

/**
 * Readiness check endpoint
 * GET /api/health/ready
 */
export const getReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    const readinessStatus = await healthService.getReadinessStatus();
    
    // Set HTTP status code based on readiness
    const statusCode = readinessStatus.status === 'ready' ? 200 : 503;
    
    res.status(statusCode).json(readinessStatus);
  } catch (error) {
    logger.error('Readiness check endpoint failed', { error });
    
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
      },
      error: 'Readiness check failed',
    });
  }
};

/**
 * Liveness check endpoint (simple check that the service is running)
 * GET /api/health/live
 */
export const getLiveness = (req: Request, res: Response): void => {
  const basicHealth = healthService.getBasicHealth();
  res.status(200).json({
    status: 'alive',
    timestamp: basicHealth.timestamp,
    service: basicHealth.service,
    version: basicHealth.version,
    uptime: basicHealth.uptime,
  });
};