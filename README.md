# Backend API Project

Modern backend API system using Node.js, TypeScript, tRPC, Zod, and Prisma with Docker containerization.

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose V2 (included with Docker Desktop)

### Development Setup

1. **Quick setup (recommended):**
   ```bash
   npm run setup
   ```

2. **Manual setup:**
   ```bash
   npm run validate  # Validate Docker setup
   npm run dev       # Start development environment
   ```

3. **View logs:**
   ```bash
   npm run dev:logs
   ```

4. **Access the application:**
   - API: http://localhost:3000
   - Health Check: http://localhost:3000/api/health
   - API Documentation: http://localhost:3000/api/docs

### Production Deployment

1. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

2. **Start production environment:**
   ```bash
   npm run prod
   ```

## Services

- **Backend API**: Node.js/TypeScript with tRPC (Port 3000)
- **PostgreSQL**: Database (Port 5432)
- **Redis**: Cache and sessions (Port 6379)
- **Elasticsearch**: Search functionality (Port 9200)

## Documentation

- [Docker Setup Guide](DOCKER.md) - Comprehensive Docker documentation
- [Backend Documentation](backend/README.md) - Backend-specific documentation

## Development Commands

```bash
# Docker operations
npm run dev              # Start development environment
npm run prod             # Start production environment
npm run validate         # Validate Docker configuration

# Database operations
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:studio        # Open Prisma Studio

# Maintenance
npm run clean            # Clean up containers and volumes
npm run restart          # Restart backend service
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_NAME=backend_db

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters

# Optional
NODE_ENV=production
LOG_LEVEL=info
```

## Architecture

The application uses a microservices architecture with:

- **Multi-stage Docker builds** for optimized production images
- **Health checks** for all services
- **Automatic service discovery** via Docker networking
- **Volume persistence** for data storage
- **Security best practices** (non-root users, minimal attack surface)

For detailed information, see [DOCKER.md](DOCKER.md).
