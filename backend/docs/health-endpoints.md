# Health Check Endpoints

This document describes the health check and monitoring endpoints available in the backend API.

## Overview

The health check system provides three types of endpoints:
- **Liveness**: Basic check that the service is running
- **Readiness**: Check that the service is ready to accept traffic
- **Health**: Comprehensive check of all service dependencies

## Endpoints

### GET /api/health

Comprehensive health check that tests all service dependencies.

**Response Status Codes:**
- `200`: Service is healthy or degraded but operational
- `503`: Service is unhealthy

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "service": "backend-api",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "database": {
      "status": "healthy|unhealthy",
      "responseTime": 10,
      "error": "Optional error message"
    },
    "cache": {
      "status": "healthy|unhealthy",
      "responseTime": 5,
      "error": "Optional error message"
    },
    "search": {
      "status": "healthy|unhealthy",
      "responseTime": 15,
      "error": "Optional error message"
    }
  }
}
```

**Status Logic:**
- `healthy`: All dependencies are healthy
- `degraded`: Some dependencies are unhealthy but service is still operational
- `unhealthy`: All dependencies are unhealthy or critical failures

### GET /api/health/ready

Readiness check that verifies the service is ready to accept traffic. Primarily checks database connectivity.

**Response Status Codes:**
- `200`: Service is ready
- `503`: Service is not ready

**Response Format:**
```json
{
  "status": "ready|not_ready",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "checks": {
    "database": true
  }
}
```

### GET /api/health/live

Liveness check that verifies the service is running. Always returns success if the service is responding.

**Response Status Codes:**
- `200`: Service is alive

**Response Format:**
```json
{
  "status": "alive",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "service": "backend-api",
  "version": "1.0.0",
  "uptime": 3600
}
```

### GET /health (Legacy)

Legacy endpoint for backward compatibility. Returns the same response as `/api/health/live`.

## Health Check Configuration

Health checks can be configured using environment variables:

- `HEALTH_CHECK_TIMEOUT`: Timeout for dependency checks in milliseconds (default: 5000)

## Dependencies Checked

### Database (PostgreSQL)
- Tests basic connectivity with a simple query
- Required for readiness check
- Timeout: Configurable via `HEALTH_CHECK_TIMEOUT`

### Cache (Redis)
- Tests Redis connectivity using ping command
- Optional dependency (service remains operational if unavailable)
- Timeout: Configurable via `HEALTH_CHECK_TIMEOUT`

### Search (Elasticsearch)
- Tests Elasticsearch connectivity using ping
- Optional dependency (service remains operational if unavailable)
- Timeout: Configurable via `HEALTH_CHECK_TIMEOUT`

## Usage Examples

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Kubernetes Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Load Balancer Health Check
Configure your load balancer to use `/api/health` for comprehensive health monitoring.

### Monitoring Integration
Use `/api/health` endpoint for monitoring systems to get detailed dependency status and response times.

## Error Handling

All health endpoints handle errors gracefully:
- Network timeouts are caught and reported as unhealthy
- Service connection failures are logged and reported
- Unexpected errors return appropriate HTTP status codes
- All responses include timestamps for debugging

## Response Times

The health service measures and reports response times for all dependency checks:
- Response times are measured in milliseconds
- Timeouts are enforced to prevent hanging health checks
- Response time data can be used for performance monitoring

## Implementation Details

The health check system is implemented using:
- `HealthService`: Core service for health check logic
- Express route handlers: HTTP endpoint implementations
- Timeout handling: Prevents hanging health checks
- Error handling: Graceful degradation on failures
- Logging: Structured logging for debugging and monitoring