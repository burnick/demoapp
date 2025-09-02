import { checkDatabaseHealth } from "../prisma/client";
import { cacheService } from "./cacheService";
import { searchService } from "./searchService";
import { logger } from "../utils/logger";
import { config } from "../utils/config";

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
}

export interface DetailedHealthStatus extends HealthStatus {
  dependencies: {
    database: DependencyStatus;
    cache: DependencyStatus;
    search: DependencyStatus;
  };
}

export interface DependencyStatus {
  status: "healthy" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface ReadinessStatus {
  status: "ready" | "not_ready";
  timestamp: string;
  checks: {
    database: boolean;
  };
}

class HealthService {
  private startTime: number;
  private readonly serviceName = "backend-api";
  private readonly serviceVersion = "1.0.0";

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Get basic health status
   */
  getBasicHealth(): HealthStatus {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: this.serviceVersion,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Check database connectivity with timeout
   */
  private async checkDatabaseWithTimeout(): Promise<DependencyStatus> {
    const startTime = Date.now();
    const timeout = config.HEALTH_CHECK_TIMEOUT;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Database health check timeout")),
          timeout
        );
      });

      const healthPromise = checkDatabaseHealth();
      const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error("Database health check failed", { error, responseTime });

      return {
        status: "unhealthy",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check Redis connectivity with timeout
   */
  private async checkRedisWithTimeout(): Promise<DependencyStatus> {
    const startTime = Date.now();
    const timeout = config.HEALTH_CHECK_TIMEOUT;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Redis health check timeout")),
          timeout
        );
      });

      const healthPromise = cacheService.isHealthy();
      const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error("Redis health check failed", { error, responseTime });

      return {
        status: "unhealthy",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check Elasticsearch connectivity with timeout
   */
  private async checkElasticsearchWithTimeout(): Promise<DependencyStatus> {
    const startTime = Date.now();
    // Use a longer timeout for Elasticsearch as it can be slower to respond
    // Fallback to 30 seconds if config is not available
    const timeout = config.ELASTICSEARCH_HEALTH_TIMEOUT || 30000;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Elasticsearch health check timeout")),
          timeout
        );
      });

      // Pass the timeout to the search service with a small buffer
      const healthPromise = searchService.isHealthy(
        Math.max(timeout - 2000, 10000)
      ); // Give 2 second buffer, minimum 10s
      const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      return {
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error("Elasticsearch health check failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        responseTime,
        timeout,
        elasticsearchUrl: config.ELASTICSEARCH_URL,
        configuredTimeout: config.ELASTICSEARCH_HEALTH_TIMEOUT,
      });

      return {
        status: "unhealthy",
        responseTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get detailed health status with all dependencies
   */
  async getDetailedHealth(): Promise<DetailedHealthStatus> {
    const basicHealth = this.getBasicHealth();

    try {
      // Run all health checks in parallel
      const [databaseStatus, cacheStatus, searchStatus] = await Promise.all([
        this.checkDatabaseWithTimeout(),
        this.checkRedisWithTimeout(),
        this.checkElasticsearchWithTimeout(),
      ]);

      // Determine overall health status
      // Database is critical, cache and search are optional
      const criticalHealthy = databaseStatus.status === "healthy";
      const allHealthy =
        databaseStatus.status === "healthy" &&
        cacheStatus.status === "healthy" &&
        searchStatus.status === "healthy";

      let overallStatus: "healthy" | "unhealthy" | "degraded";
      if (allHealthy) {
        overallStatus = "healthy";
      } else if (criticalHealthy) {
        // If database is healthy but cache/search are not, we're degraded but operational
        overallStatus = "degraded";
      } else {
        // If database is unhealthy, we're unhealthy
        overallStatus = "unhealthy";
      }

      return {
        ...basicHealth,
        status: overallStatus,
        dependencies: {
          database: databaseStatus,
          cache: cacheStatus,
          search: searchStatus,
        },
      };
    } catch (error) {
      logger.error("Health check failed", { error });

      return {
        ...basicHealth,
        status: "unhealthy",
        dependencies: {
          database: { status: "unhealthy", error: "Health check failed" },
          cache: { status: "unhealthy", error: "Health check failed" },
          search: { status: "unhealthy", error: "Health check failed" },
        },
      };
    }
  }

  /**
   * Get readiness status (primarily database connectivity)
   */
  async getReadinessStatus(): Promise<ReadinessStatus> {
    try {
      const databaseStatus = await this.checkDatabaseWithTimeout();
      const isDatabaseReady = databaseStatus.status === "healthy";

      return {
        status: isDatabaseReady ? "ready" : "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: isDatabaseReady,
        },
      };
    } catch (error) {
      logger.error("Readiness check failed", { error });

      return {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: false,
        },
      };
    }
  }

  /**
   * Reset the service start time (useful for testing)
   */
  resetStartTime(): void {
    this.startTime = Date.now();
  }
}

// Create singleton instance
export const healthService = new HealthService();
