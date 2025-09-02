import request from 'supertest';
import express from 'express';
import { getHealth, getReadiness, getLiveness } from '../routes/health';

// Create a simple test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add health endpoints
  app.get('/api/health', getHealth);
  app.get('/api/health/ready', getReadiness);
  app.get('/api/health/live', getLiveness);
  app.get('/health', getLiveness);
  
  return app;
};

// Mock the dependencies
jest.mock('../services/cacheService', () => ({
  cacheService: {
    isHealthy: jest.fn(),
  },
}));

jest.mock('../services/searchService', () => ({
  searchService: {
    isHealthy: jest.fn(),
  },
}));

jest.mock('../prisma/client', () => ({
  checkDatabaseHealth: jest.fn(),
}));

jest.mock('../services/healthService', () => ({
  healthService: {
    getDetailedHealth: jest.fn(),
    getReadinessStatus: jest.fn(),
    getBasicHealth: jest.fn(),
    resetStartTime: jest.fn(),
  },
}));

import { cacheService } from '../services/cacheService';
import { searchService } from '../services/searchService';
import { checkDatabaseHealth } from '../prisma/client';
import { healthService } from '../services/healthService';

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockSearchService = searchService as jest.Mocked<typeof searchService>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;
const mockHealthService = healthService as jest.Mocked<typeof healthService>;

describe('Health Endpoints Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all dependencies are healthy', async () => {
      const mockHealthStatus = {
        status: 'healthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        service: 'backend-api',
        version: '1.0.0',
        uptime: 100,
        dependencies: {
          database: { status: 'healthy' as const, responseTime: 10 },
          cache: { status: 'healthy' as const, responseTime: 5 },
          search: { status: 'healthy' as const, responseTime: 15 },
        },
      };

      mockHealthService.getDetailedHealth.mockResolvedValue(mockHealthStatus);

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual(mockHealthStatus);
      expect(mockHealthService.getDetailedHealth).toHaveBeenCalledTimes(1);
    });

    it('should return degraded status with 200 when some dependencies are unhealthy', async () => {
      const mockHealthStatus = {
        status: 'degraded' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        service: 'backend-api',
        version: '1.0.0',
        uptime: 100,
        dependencies: {
          database: { status: 'healthy' as const, responseTime: 10 },
          cache: { status: 'unhealthy' as const, responseTime: 5, error: 'Connection failed' },
          search: { status: 'healthy' as const, responseTime: 15 },
        },
      };

      mockHealthService.getDetailedHealth.mockResolvedValue(mockHealthStatus);

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual(mockHealthStatus);
    });

    it('should return unhealthy status with 503 when all dependencies are unhealthy', async () => {
      const mockHealthStatus = {
        status: 'unhealthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        service: 'backend-api',
        version: '1.0.0',
        uptime: 100,
        dependencies: {
          database: { status: 'unhealthy' as const, responseTime: 10, error: 'Connection failed' },
          cache: { status: 'unhealthy' as const, responseTime: 5, error: 'Connection failed' },
          search: { status: 'unhealthy' as const, responseTime: 15, error: 'Connection failed' },
        },
      };

      mockHealthService.getDetailedHealth.mockResolvedValue(mockHealthStatus);

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toEqual(mockHealthStatus);
    });

    it('should handle health service errors gracefully', async () => {
      mockHealthService.getDetailedHealth.mockRejectedValue(new Error('Health service failed'));

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        service: 'backend-api',
        version: '1.0.0',
        error: 'Health check failed',
      });
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready status when database is healthy', async () => {
      const mockReadinessStatus = {
        status: 'ready' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        checks: {
          database: true,
        },
      };

      mockHealthService.getReadinessStatus.mockResolvedValue(mockReadinessStatus);

      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toEqual(mockReadinessStatus);
      expect(mockHealthService.getReadinessStatus).toHaveBeenCalledTimes(1);
    });

    it('should return not ready status with 503 when database is unhealthy', async () => {
      const mockReadinessStatus = {
        status: 'not_ready' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        checks: {
          database: false,
        },
      };

      mockHealthService.getReadinessStatus.mockResolvedValue(mockReadinessStatus);

      const response = await request(app)
        .get('/api/health/ready')
        .expect(503);

      expect(response.body).toEqual(mockReadinessStatus);
    });

    it('should handle readiness service errors gracefully', async () => {
      mockHealthService.getReadinessStatus.mockRejectedValue(new Error('Readiness check failed'));

      const response = await request(app)
        .get('/api/health/ready')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'not_ready',
        checks: {
          database: false,
        },
        error: 'Readiness check failed',
      });
    });
  });

  describe('GET /api/health/live', () => {
    it('should always return alive status', async () => {
      const mockBasicHealth = {
        status: 'healthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        service: 'backend-api',
        version: '1.0.0',
        uptime: 100,
      };

      mockHealthService.getBasicHealth.mockReturnValue(mockBasicHealth);

      const response = await request(app)
        .get('/api/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        service: 'backend-api',
        version: '1.0.0',
        timestamp: mockBasicHealth.timestamp,
        uptime: mockBasicHealth.uptime,
      });
    });
  });

  describe('GET /health (legacy endpoint)', () => {
    it('should return alive status for backward compatibility', async () => {
      const mockBasicHealth = {
        status: 'healthy' as const,
        timestamp: '2023-01-01T00:00:00.000Z',
        service: 'backend-api',
        version: '1.0.0',
        uptime: 100,
      };

      mockHealthService.getBasicHealth.mockReturnValue(mockBasicHealth);

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        service: 'backend-api',
        version: '1.0.0',
        timestamp: mockBasicHealth.timestamp,
        uptime: mockBasicHealth.uptime,
      });
    });
  });
});