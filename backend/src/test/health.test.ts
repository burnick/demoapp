import { healthService } from '../services/healthService';
import { cacheService } from '../services/cacheService';
import { searchService } from '../services/searchService';
import { checkDatabaseHealth } from '../prisma/client';

// Mock the services for testing
jest.mock('../services/cacheService');
jest.mock('../services/searchService');
jest.mock('../prisma/client');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockSearchService = searchService as jest.Mocked<typeof searchService>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;

describe('HealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    healthService.resetStartTime();
  });

  describe('getBasicHealth', () => {
    it('should return basic health information', () => {
      const health = healthService.getBasicHealth();

      expect(health).toMatchObject({
        status: 'healthy',
        service: 'backend-api',
        version: '1.0.0',
      });

      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health with all dependencies', async () => {
      // Mock all services as healthy
      mockCheckDatabaseHealth.mockResolvedValue(true);
      mockCacheService.isHealthy.mockResolvedValue(true);
      mockSearchService.isHealthy.mockResolvedValue(true);

      const health = await healthService.getDetailedHealth();

      expect(health).toMatchObject({
        status: 'healthy',
        service: 'backend-api',
        version: '1.0.0',
        dependencies: {
          database: { status: 'healthy' },
          cache: { status: 'healthy' },
          search: { status: 'healthy' },
        },
      });
    });

    it('should return degraded status when some dependencies are unhealthy', async () => {
      // Mock database as healthy, cache as unhealthy, search as healthy
      mockCheckDatabaseHealth.mockResolvedValue(true);
      mockCacheService.isHealthy.mockResolvedValue(false);
      mockSearchService.isHealthy.mockResolvedValue(true);

      const health = await healthService.getDetailedHealth();

      expect(health).toMatchObject({
        status: 'degraded',
        service: 'backend-api',
        version: '1.0.0',
        dependencies: {
          database: { status: 'healthy' },
          cache: { status: 'unhealthy' },
          search: { status: 'healthy' },
        },
      });
    });

    it('should return unhealthy status when all dependencies are unhealthy', async () => {
      // Mock all services as unhealthy
      mockCheckDatabaseHealth.mockResolvedValue(false);
      mockCacheService.isHealthy.mockResolvedValue(false);
      mockSearchService.isHealthy.mockResolvedValue(false);

      const health = await healthService.getDetailedHealth();

      expect(health).toMatchObject({
        status: 'unhealthy',
        service: 'backend-api',
        version: '1.0.0',
        dependencies: {
          database: { status: 'unhealthy' },
          cache: { status: 'unhealthy' },
          search: { status: 'unhealthy' },
        },
      });
    });

    it('should handle service errors gracefully', async () => {
      // Mock services to throw errors
      mockCheckDatabaseHealth.mockRejectedValue(new Error('Database connection failed'));
      mockCacheService.isHealthy.mockRejectedValue(new Error('Redis connection failed'));
      mockSearchService.isHealthy.mockRejectedValue(new Error('Elasticsearch connection failed'));

      const health = await healthService.getDetailedHealth();

      expect(health).toMatchObject({
        status: 'unhealthy',
        service: 'backend-api',
        version: '1.0.0',
        dependencies: {
          database: { 
            status: 'unhealthy',
            error: 'Database connection failed',
          },
          cache: { 
            status: 'unhealthy',
            error: 'Redis connection failed',
          },
          search: { 
            status: 'unhealthy',
            error: 'Elasticsearch connection failed',
          },
        },
      });
    });

    it('should include response times for all dependencies', async () => {
      // Mock all services as healthy with some delay
      mockCheckDatabaseHealth.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 10))
      );
      mockCacheService.isHealthy.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 20))
      );
      mockSearchService.isHealthy.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 30))
      );

      const health = await healthService.getDetailedHealth();

      expect(health.dependencies.database.responseTime).toBeGreaterThan(0);
      expect(health.dependencies.cache.responseTime).toBeGreaterThan(0);
      expect(health.dependencies.search.responseTime).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios', async () => {
      // Mock services to take longer than timeout (5000ms default)
      mockCheckDatabaseHealth.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 10000))
      );
      mockCacheService.isHealthy.mockResolvedValue(true);
      mockSearchService.isHealthy.mockResolvedValue(true);

      const health = await healthService.getDetailedHealth();

      expect(health.dependencies.database.status).toBe('unhealthy');
      expect(health.dependencies.database.error).toContain('timeout');
    });
  });

  describe('getReadinessStatus', () => {
    it('should return ready when database is healthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue(true);

      const readiness = await healthService.getReadinessStatus();

      expect(readiness).toMatchObject({
        status: 'ready',
        checks: {
          database: true,
        },
      });
    });

    it('should return not ready when database is unhealthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue(false);

      const readiness = await healthService.getReadinessStatus();

      expect(readiness).toMatchObject({
        status: 'not_ready',
        checks: {
          database: false,
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockCheckDatabaseHealth.mockRejectedValue(new Error('Database connection failed'));

      const readiness = await healthService.getReadinessStatus();

      expect(readiness).toMatchObject({
        status: 'not_ready',
        checks: {
          database: false,
        },
      });
    });
  });
});