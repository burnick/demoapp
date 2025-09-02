# Backend API

Modern backend API system using Node.js, TypeScript, tRPC, Zod, and Prisma with comprehensive features for production-ready applications.

## Features

- **Type-safe API**: Built with tRPC for end-to-end type safety between client and server
- **Runtime validation**: Zod schemas for input/output validation with automatic type inference
- **Database ORM**: Prisma for type-safe database operations with migrations and seeding
- **OpenAPI compatible**: Automatic API documentation generation with Swagger UI
- **File-based routing**: Organized route structure with automatic discovery and loading
- **API versioning**: Support for multiple API versions (v1, v2) with deprecation management
- **Authentication & Authorization**: JWT-based auth with session management and MFA support
- **Caching**: Redis integration for session storage and data caching
- **Search**: Elasticsearch integration for full-text search and analytics
- **Health monitoring**: Comprehensive health checks for all dependencies
- **Testing**: Complete test suite with unit, integration, and tRPC-specific tests
- **Docker ready**: Multi-stage Docker builds for development and production

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL database
- Redis (for caching and sessions)
- Elasticsearch (for search functionality)

## Getting Started

### Local Development (without Docker)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate  # Generate Prisma client
   npm run db:migrate   # Run database migrations
   npm run db:seed      # Seed database with test data
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000`.

### Docker Development (Recommended)

From the project root directory:

```bash
# Start all services (backend, database, Redis, Elasticsearch)
npm run dev

# View logs
npm run dev:logs

# Access the application
# - API: http://localhost:3000
# - Health: http://localhost:3000/api/health
# - Docs: http://localhost:3000/api/docs
```

## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload using tsx
- `npm run build` - Build TypeScript to JavaScript for production
- `npm run start` - Start production server from built files
- `npm run start:prod` - Start production server with NODE_ENV=production

### Code Quality
- `npm run type-check` - Run TypeScript type checking without emitting files
- `npm run lint` - Run ESLint on source files
- `npm run lint:fix` - Run ESLint and automatically fix issues

### Testing
- `npm test` - Run all tests using custom test runner
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:trpc` - Run tRPC-specific tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:ci` - Run tests in CI mode with coverage and reporting

### Database Operations
- `npm run db:generate` - Generate Prisma client from schema
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and run database migrations
- `npm run db:migrate:prod` - Deploy migrations in production
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio for database management

### Docker Operations
- `npm run docker:build` - Build Docker image
- `npm run docker:build:dev` - Build development Docker image
- `npm run docker:build:prod` - Build production Docker image
- `npm run docker:run` - Run Docker container
- `npm run docker:compose:up` - Start with docker-compose

## Project Structure

```
src/
├── routes/              # API routes (file-based routing)
│   ├── v1/             # Version 1 API endpoints
│   │   ├── auth.ts     # Authentication endpoints
│   │   ├── users.ts    # User management endpoints
│   │   └── index.ts    # Route aggregation
│   ├── v2/             # Version 2 API endpoints (enhanced)
│   │   ├── auth.ts     # Enhanced auth with MFA, device tracking
│   │   ├── users.ts    # Enhanced users with preferences, analytics
│   │   └── index.ts    # Route aggregation
│   └── index.ts        # Main router configuration
├── controllers/         # Request handlers and business logic coordination
│   ├── authController.ts    # Authentication business logic
│   ├── userController.ts    # User management business logic
│   ├── baseController.ts    # Base controller with common functionality
│   └── index.ts        # Controller exports
├── services/           # Business logic and external service integration
│   ├── authService.ts      # Authentication service
│   ├── userService.ts      # User management service
│   ├── cacheService.ts     # Redis caching service
│   ├── searchService.ts    # Elasticsearch search service
│   ├── healthService.ts    # Health check service
│   ├── openApiService.ts   # OpenAPI documentation service
│   ├── sessionService.ts   # Session management service
│   └── index.ts        # Service exports
├── schemas/            # Zod validation schemas
│   ├── auth.ts         # Authentication schemas
│   ├── user.ts         # User schemas
│   ├── common.ts       # Common/shared schemas
│   ├── search.ts       # Search schemas
│   ├── examples.ts     # Example schemas for testing
│   └── index.ts        # Schema exports
├── middleware/         # Express middleware
│   ├── cache.ts        # Caching middleware
│   ├── swagger.ts      # Swagger UI middleware
│   └── versioning.ts   # API versioning middleware
├── utils/              # Utility functions and helpers
│   ├── config.ts       # Configuration management
│   ├── logger.ts       # Structured logging
│   ├── errors.ts       # Error handling utilities
│   ├── helpers.ts      # General helper functions
│   ├── openapi.ts      # OpenAPI generation utilities
│   ├── database.ts     # Database utilities
│   ├── redis.ts        # Redis utilities
│   ├── elasticsearch.ts # Elasticsearch utilities
│   ├── routeLoader.ts  # Dynamic route loading
│   └── searchIndexer.ts # Search indexing utilities
├── prisma/             # Prisma client configuration
│   ├── client.ts       # Prisma client setup
│   ├── seed.ts         # Database seeding
│   └── index.ts        # Prisma exports
├── trpc/               # tRPC configuration
│   ├── context.ts      # tRPC context creation
│   ├── router.ts       # Main tRPC router
│   ├── server.ts       # tRPC server setup
│   └── index.ts        # tRPC exports
├── test/               # Test files and utilities
│   ├── setup.ts        # Test environment setup
│   ├── testUtils.ts    # Test utility functions
│   ├── testRunner.ts   # Custom test runner
│   └── *.test.ts       # Test files
├── examples/           # Usage examples
│   ├── cacheUsage.ts   # Cache usage examples
│   └── searchUsage.ts  # Search usage examples
└── server.ts           # Application entry point
```

## API Documentation

### Interactive Documentation

Once the server is running, comprehensive API documentation is available:

- **Interactive Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON Spec**: `http://localhost:3000/api/docs/openapi.json`
- **Documentation Stats**: `http://localhost:3000/api/docs/stats`

### API Endpoints Overview

#### Authentication (V1)
- User registration and login
- JWT token management
- Password reset functionality
- Email verification
- Basic user profile management

#### Authentication (V2 - Enhanced)
- All V1 features plus:
- Multi-factor authentication (MFA)
- Device tracking and management
- Security event logging
- Risk-based authentication
- Enhanced session management

#### User Management (V1)
- User CRUD operations
- User search and filtering
- Profile management
- Basic pagination

#### User Management (V2 - Enhanced)
- All V1 features plus:
- User preferences and metadata
- Bulk operations (activate, deactivate, suspend)
- Advanced analytics and reporting
- Enhanced search with facets
- Tag-based organization
- User status management

#### Health & Monitoring
- Comprehensive health checks
- Dependency status monitoring
- Readiness and liveness probes
- Performance metrics

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/backend_api"

# JWT Security
JWT_SECRET="your-super-secret-jwt-key-here-must-be-at-least-32-characters-long"
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

### Optional Variables

```bash
# Redis (for caching and sessions)
REDIS_URL="redis://localhost:6379"
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch (for search)
ELASTICSEARCH_URL="http://localhost:9201"

# API Configuration
API_PREFIX=/api
API_VERSION=v1
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
LOG_FILE_ENABLED=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Checks
HEALTH_CHECK_TIMEOUT=5000
```

## Testing

### Test Categories

The project includes comprehensive testing:

```bash
# Run all tests
npm test

# Specific test categories
npm run test:unit        # Unit tests for services, utilities
npm run test:integration # Integration tests for API endpoints
npm run test:trpc        # tRPC-specific functionality tests
npm run test:coverage    # Generate coverage report
npm run test:watch       # Watch mode for development
```

### Test Structure

- **Unit Tests**: Test individual functions and services in isolation
- **Integration Tests**: Test complete API workflows with database
- **tRPC Tests**: Test tRPC procedures and type safety
- **Health Tests**: Test health check endpoints and dependency monitoring
- **Versioning Tests**: Test API versioning and deprecation features

### Test Environment

Tests use:
- Isolated test database with automatic cleanup
- Mocked external services (Redis, Elasticsearch)
- Comprehensive test data seeding
- Automated setup and teardown

## API Versioning

### Version Support

- **V1**: Stable API with core functionality
- **V2**: Enhanced API with advanced features

### Version Detection

The API automatically detects versions from:
1. **URL Path**: `/trpc/v1.users.list` or `/trpc/v2.users.list`
2. **HTTP Headers**: `Accept-Version: v1` or `API-Version: v2`

### Deprecation Management

- Automatic deprecation warnings for older versions
- Sunset date headers for planned deprecations
- Migration guides and breaking change documentation
- Usage analytics for version adoption tracking

## Performance & Monitoring

### Caching Strategy

- **Redis Integration**: Session storage and data caching
- **Query Caching**: Frequently accessed data caching
- **OpenAPI Caching**: Generated documentation caching

### Health Monitoring

- **Liveness Checks**: Basic service availability
- **Readiness Checks**: Service readiness for traffic
- **Dependency Checks**: Database, Redis, Elasticsearch status
- **Performance Metrics**: Response times and error rates

### Logging

- **Structured Logging**: JSON-formatted logs with Winston
- **Log Levels**: Configurable logging levels (error, warn, info, debug)
- **Request Logging**: Automatic request/response logging
- **Error Tracking**: Comprehensive error logging and tracking

## Security Features

### Authentication & Authorization

- **JWT Tokens**: Secure token-based authentication
- **Session Management**: Redis-based session storage
- **Multi-Factor Authentication**: TOTP and SMS-based MFA (V2)
- **Device Tracking**: Device fingerprinting and management (V2)

### Security Monitoring

- **Security Events**: Logging of authentication events (V2)
- **Risk Assessment**: Risk-based authentication scoring (V2)
- **Rate Limiting**: Configurable request rate limiting
- **Input Validation**: Comprehensive Zod-based validation

## Docker Integration

### Development

```bash
# Build development image
npm run docker:build:dev

# Run with development configuration
npm run docker:compose:dev
```

### Production

```bash
# Build optimized production image
npm run docker:build:prod

# Run production container
npm run docker:run:prod
```

### Multi-stage Builds

The Dockerfile uses multi-stage builds:
1. **Builder Stage**: Install dependencies and build application
2. **Production Stage**: Optimized runtime image with minimal dependencies

## Contributing

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Install dependencies**: `npm install`
4. **Make your changes** following existing patterns
5. **Add tests** for new functionality
6. **Run tests**: `npm test`
7. **Check types**: `npm run type-check`
8. **Lint code**: `npm run lint:fix`
9. **Update documentation** if needed
10. **Submit a pull request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules
- **Zod**: Runtime validation for all inputs/outputs
- **tRPC**: Type-safe API procedures
- **Prisma**: Type-safe database operations
- **Testing**: Comprehensive test coverage required

### Commit Guidelines

- Use conventional commit messages
- Include tests for new features
- Update documentation for API changes
- Ensure all tests pass
- Follow existing code patterns

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and accessible
2. **Redis Connection**: Check Redis service availability for caching features
3. **Elasticsearch**: Verify Elasticsearch is running for search functionality
4. **Port Conflicts**: Ensure port 3000 is available
5. **Environment Variables**: Verify all required environment variables are set

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Health Checks

Monitor service health:

```bash
curl http://localhost:3000/api/health
```

## License

MIT