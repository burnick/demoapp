# Docker Configuration

This project uses Docker and Docker Compose for containerized development and deployment.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose V2 (comes with Docker Desktop or can be installed separately)

## Quick Start

### Development Environment

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

2. Start development environment:
   ```bash
   npm run dev
   ```

3. View logs:
   ```bash
   npm run dev:logs
   ```

4. Stop development environment:
   ```bash
   npm run dev:down
   ```

### Production Environment

1. Set production environment variables in `.env`
2. Start production environment:
   ```bash
   npm run prod
   ```

3. View logs:
   ```bash
   npm run prod:logs
   ```

4. Stop production environment:
   ```bash
   npm run prod:down
   ```

## Services

### Backend API
- **Port**: 3000
- **Health Check**: `http://localhost:3000/api/health`
- **Documentation**: `http://localhost:3000/api/docs`

### PostgreSQL Database
- **Port**: 5432
- **Database**: `backend_db` (configurable via `DB_NAME`)
- **Username**: `postgres` (configurable via `DB_USERNAME`)

### Redis Cache
- **Port**: 6379
- **URL**: `redis://localhost:6379`

### Elasticsearch
- **Port**: 9200
- **URL**: `http://localhost:9200`

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_NAME=backend_db
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Optional
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
JWT_EXPIRES_IN=7d
```

## Docker Commands

### Development
```bash
# Start development with hot reload
npm run dev

# View backend logs
npm run dev:logs

# Stop development environment
npm run dev:down
```

### Production
```bash
# Build and start production
npm run prod

# View production logs
npm run prod:logs

# Stop production environment
npm run prod:down
```

### Database Operations
```bash
# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Building Images
```bash
# Build development image
cd backend && npm run docker:build:dev

# Build production image
cd backend && npm run docker:build:prod

# Build using docker-compose
npm run build
```

### Maintenance
```bash
# Rebuild backend service
npm run build

# Restart backend service
npm run restart

# Clean up containers and volumes
npm run clean
```

## Docker Compose Files

- `docker-compose.yml`: Base configuration for all environments
- `docker-compose.dev.yml`: Development overrides (hot reload, debug ports)

## Dockerfiles

The backend includes two Dockerfiles optimized for different use cases:

### Production Dockerfile (`backend/Dockerfile`)
Multi-stage build for production:
1. **Builder Stage**: Installs dependencies and builds the application
2. **Production Stage**: Creates optimized runtime image with only production dependencies

### Development Dockerfile (`backend/development.Dockerfile`)
Single-stage build optimized for development:
- Includes development tools (git, curl, bash)
- Installs all dependencies including dev dependencies
- Optimized for hot reloading and development workflow
- Exposes debug port (9229) for Node.js debugging

## Health Checks

All services include health checks:

- **Backend**: HTTP check on `/api/health`
- **PostgreSQL**: `pg_isready` command
- **Redis**: Built-in health check
- **Elasticsearch**: HTTP check on cluster health

## Troubleshooting

### Common Build Errors

#### "target stage 'production' could not be found"
This error occurs when mixing production and development Docker configurations.

**Quick Fix:**
```bash
npm run fix:dev
```

**Manual Solution:**
```bash
# Stop containers and clean up
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
docker image rm backend-api:dev 2>/dev/null || true

# Rebuild and start
npm run dev
```

#### "port is already allocated"
Another service is using the same port.

**Solution:**
```bash
# Stop conflicting services
docker compose down
# Or modify port mappings in docker-compose.yml
```

### Port Conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml`.

### Database Connection Issues
1. Ensure PostgreSQL is healthy: `docker compose ps`
2. Check database logs: `docker compose logs db`
3. Verify environment variables in `.env`

### Backend Not Starting
1. Check backend logs: `npm run dev:logs`
2. Ensure database is ready before backend starts
3. Verify all environment variables are set

### Development Hot Reload Not Working
1. Ensure volumes are properly mounted in `docker-compose.dev.yml`
2. Check that `node_modules` volume is excluded
3. Verify file permissions on mounted volumes

### Performance Issues
1. Increase Docker Desktop memory allocation
2. Use Docker volumes for better I/O performance
3. Consider using Docker BuildKit for faster builds

## Security Notes

- Change default passwords in production
- Use strong JWT secrets (minimum 32 characters)
- Run containers as non-root users (already configured)
- Keep Docker images updated
- Use secrets management for sensitive data in production