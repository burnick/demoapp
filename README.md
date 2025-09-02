# Backend API Project

Modern backend API system using Node.js, TypeScript, tRPC, Zod, and Prisma with Docker containerization.

## Features

- **Type-safe API**: Built with tRPC for end-to-end type safety
- **Runtime validation**: Zod schemas for input/output validation  
- **Database ORM**: Prisma for type-safe database operations
- **OpenAPI compatible**: Automatic API documentation generation
- **File-based routing**: Organized route structure with versioning support
- **Multi-version API**: Support for v1 and v2 endpoints with deprecation management
- **Comprehensive caching**: Redis integration for sessions and data caching
- **Full-text search**: Elasticsearch integration for advanced search capabilities
- **Health monitoring**: Built-in health checks and monitoring endpoints
- **Docker ready**: Containerized for easy deployment and development

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
   - Prisma Studio: http://localhost:5555 (after running `npm run db:studio`)

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

## Third-Party OAuth Integration

The backend includes comprehensive OAuth integration for Google and Facebook authentication:

### Available OAuth Endpoints

- `GET /v1.thirdPartyOAuth.getProviders` - Get list of available OAuth providers
- `POST /v1.thirdPartyOAuth.getAuthUrl` - Generate OAuth authorization URL
- `POST /v1.thirdPartyOAuth.handleCallback` - Handle OAuth callback and authenticate user
- `GET /v1.thirdPartyOAuth.getStatus` - Get OAuth service status (for debugging)

### OAuth Provider Setup

#### Google OAuth Setup
1. Visit [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth2 API
4. Create OAuth 2.0 credentials (Web application)
5. Set authorized redirect URI: `http://localhost:3000/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

#### Facebook OAuth Setup
1. Visit [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add Facebook Login product
4. Configure OAuth redirect URI: `http://localhost:3000/auth/facebook/callback`
5. Copy App ID and App Secret to your `.env` file

### OAuth Flow
1. Client requests available providers from `/v1.thirdPartyOAuth.getProviders`
2. Client gets authorization URL from `/v1.thirdPartyOAuth.getAuthUrl`
3. User is redirected to OAuth provider (Google/Facebook)
4. Provider redirects back with authorization code
5. Client sends code to `/v1.thirdPartyOAuth.handleCallback`
6. Backend exchanges code for user info and returns JWT tokens

## API Endpoints

### Third-Party OAuth Endpoints

- `GET /trpc/v1.thirdPartyOAuth.getProviders` - Get available OAuth providers (Google, Facebook)
- `POST /trpc/v1.thirdPartyOAuth.getAuthUrl` - Generate OAuth authorization URL for specified provider
- `POST /trpc/v1.thirdPartyOAuth.handleCallback` - Handle OAuth callback and authenticate user
- `GET /trpc/v1.thirdPartyOAuth.getStatus` - Get OAuth service status and configuration

### Authentication Endpoints

#### V1 Authentication
- `POST /trpc/v1.auth.register` - User registration
- `POST /trpc/v1.auth.login` - User login
- `POST /trpc/v1.auth.refreshToken` - Refresh JWT token
- `POST /trpc/v1.auth.logout` - User logout
- `POST /trpc/v1.auth.changePassword` - Change user password
- `POST /trpc/v1.auth.forgotPassword` - Request password reset
- `POST /trpc/v1.auth.resetPassword` - Reset password with token
- `POST /trpc/v1.auth.verifyEmail` - Verify email address
- `GET /trpc/v1.auth.me` - Get current user profile

#### V2 Authentication (Enhanced)
- `POST /trpc/v2.auth.register` - Enhanced registration with preferences and metadata
- `POST /trpc/v2.auth.login` - Enhanced login with device tracking and security
- `POST /trpc/v2.auth.setupMfa` - Setup multi-factor authentication
- `POST /trpc/v2.auth.verifyMfa` - Verify MFA token
- `POST /trpc/v2.auth.manageSessions` - Manage user sessions
- `GET /trpc/v2.auth.getSecurityEvents` - Get security event history
- `POST /trpc/v2.auth.refreshToken` - Enhanced token refresh with device info
- `POST /trpc/v2.auth.logout` - Enhanced logout with security event logging
- `POST /trpc/v2.auth.changePassword` - Enhanced password change with security
- `GET /trpc/v2.auth.me` - Get enhanced user profile with permissions

### User Management Endpoints

#### V1 User Management
- `GET /trpc/v1.users.list` - List users with pagination
- `GET /trpc/v1.users.getById` - Get user by ID
- `POST /trpc/v1.users.create` - Create new user
- `PUT /trpc/v1.users.update` - Update user
- `DELETE /trpc/v1.users.delete` - Delete user
- `GET /trpc/v1.users.profile` - Get current user profile
- `PUT /trpc/v1.users.updateProfile` - Update current user profile
- `GET /trpc/v1.users.search` - Search users
- `GET /trpc/v1.users.advancedSearch` - Advanced user search with filters
- `GET /trpc/v1.users.suggestions` - Get user suggestions

#### V2 User Management (Enhanced)
- `GET /trpc/v2.users.list` - Enhanced user listing with advanced pagination
- `GET /trpc/v2.users.getById` - Get enhanced user data with preferences and metadata
- `POST /trpc/v2.users.create` - Create user with preferences, tags, and metadata
- `PUT /trpc/v2.users.update` - Update user with enhanced data structure
- `POST /trpc/v2.users.bulkOperations` - Bulk user operations (activate, deactivate, suspend)
- `GET /trpc/v2.users.analytics` - User analytics and reporting
- `GET /trpc/v2.users.advancedSearch` - Advanced search with facets and aggregations
- `DELETE /trpc/v2.users.delete` - Enhanced user deletion with data transfer options
- `GET /trpc/v2.users.profile` - Get enhanced current user profile
- `PUT /trpc/v2.users.updateProfile` - Update enhanced user profile

### Health and Monitoring Endpoints
- `GET /api/health` - Comprehensive health check with dependency status
- `GET /api/health/ready` - Readiness check for load balancers
- `GET /api/health/live` - Liveness check for container orchestration
- `GET /health` - Legacy health endpoint (redirects to /api/health/live)

### Documentation Endpoints
- `GET /api/docs` - Interactive Swagger UI documentation
- `GET /docs` - Redirects to /api/docs
- `GET /api/docs/openapi.json` - OpenAPI JSON specification
- `GET /api/docs/stats` - OpenAPI document statistics
- `DELETE /api/docs/cache` - Clear OpenAPI cache (development only)

### Version Information
- `GET /api/versions` - Get available API versions and deprecation info

## Services

- **Backend API**: Node.js/TypeScript with tRPC (Port 3000)
- **PostgreSQL**: Database (Port 5432)
- **Redis**: Cache and sessions (Port 6379)
- **Elasticsearch**: Search functionality (Port 9201)

## Development Workflow

### Local Development

1. **Start development environment:**
   ```bash
   npm run dev
   ```

2. **View real-time logs:**
   ```bash
   npm run dev:logs
   ```

3. **Run tests:**
   ```bash
   npm run backend:test
   ```

4. **Database operations:**
   ```bash
   npm run db:migrate    # Run migrations
   npm run db:seed       # Seed test data
   npm run db:studio     # Open Prisma Studio
   ```

### Code Quality

```bash
# Type checking
cd backend && npm run type-check

# Linting
cd backend && npm run lint
cd backend && npm run lint:fix

# Testing
cd backend && npm run test           # Run all tests
cd backend && npm run test:unit      # Unit tests only
cd backend && npm run test:integration # Integration tests only
cd backend && npm run test:coverage  # Generate coverage report
```

### Database Management

```bash
# Generate Prisma client
cd backend && npm run db:generate

# Create and run migrations
cd backend && npm run db:migrate

# Deploy migrations (production)
cd backend && npm run db:migrate:prod

# Seed database
cd backend && npm run db:seed

# Open Prisma Studio
cd backend && npm run db:studio
```

## Docker Deployment

### Development Deployment

```bash
# Start all services in development mode
npm run dev

# View logs
npm run dev:logs

# Stop services
npm run dev:down
```

### Production Deployment

```bash
# Build and start production environment
npm run prod

# View production logs
npm run prod:logs

# Stop production environment
npm run prod:down
```

### Docker Commands

```bash
# Build backend image
npm run build

# Restart backend service
npm run restart

# Clean up containers and volumes
npm run clean

# Validate Docker configuration
npm run validate
```

## Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password_here
DB_NAME=backend_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# OAuth Configuration (Required for third-party authentication)
# Google OAuth - Get from https://console.developers.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth - Get from https://developers.facebook.com/
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
```

### Optional Environment Variables

```bash
# External Services (automatically configured in Docker)
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://postgres:password@db:5432/backend_db
ELASTICSEARCH_URL=http://elasticsearch:9201

# OAuth Redirect URLs (optional - defaults provided)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
FACEBOOK_REDIRECT_URI=http://localhost:3000/auth/facebook/callback

# OAuth Scopes (optional - defaults provided)
GOOGLE_SCOPES=openid,profile,email
FACEBOOK_SCOPES=email,public_profile

# API Configuration
API_PREFIX=/api
API_VERSION=v1
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Check Configuration
HEALTH_CHECK_TIMEOUT=5000
```

## Architecture

### System Architecture

The application uses a microservices architecture with:

- **Multi-stage Docker builds** for optimized production images
- **Health checks** for all services
- **Automatic service discovery** via Docker networking
- **Volume persistence** for data storage
- **Security best practices** (non-root users, minimal attack surface)

### Project Structure

```
├── backend/                 # Backend API application
│   ├── src/
│   │   ├── routes/         # API routes (file-based routing)
│   │   │   ├── v1/         # Version 1 API endpoints
│   │   │   └── v2/         # Version 2 API endpoints (enhanced)
│   │   ├── controllers/    # Request handlers and business logic
│   │   ├── services/       # Business logic and external integrations
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions and helpers
│   │   ├── prisma/         # Prisma client configuration
│   │   └── test/           # Test files and utilities
│   ├── prisma/             # Database schema and migrations
│   ├── docs/               # API documentation
│   └── Dockerfile          # Production Docker configuration
├── data/                   # Service configuration files
├── scripts/                # Setup and maintenance scripts
├── docker-compose.yml      # Base Docker Compose configuration
├── docker-compose.dev.yml  # Development overrides
└── docker-compose.prod.yml # Production overrides
```

## API Versioning

The API supports multiple versions with automatic deprecation management:

- **V1**: Stable API with core functionality
- **V2**: Enhanced API with advanced features, preferences, and security

### Version Detection

The API automatically detects versions from:
1. URL path: `/trpc/v1.users.list` or `/trpc/v2.users.list`
2. HTTP headers: `Accept-Version: v1` or `API-Version: v2`

### Migration Guide

When upgrading from V1 to V2:
- V2 includes all V1 functionality with enhancements
- New fields: `preferences`, `metadata`, `tags`, `status`, `statistics`
- Enhanced security features: MFA, device tracking, security events
- Improved pagination and search capabilities

## Testing

### Test Categories

```bash
# Run all tests
npm run backend:test

# Specific test categories
cd backend && npm run test:unit        # Unit tests
cd backend && npm run test:integration # Integration tests
cd backend && npm run test:trpc        # tRPC-specific tests
cd backend && npm run test:coverage    # Coverage report
```

### Test Environment

Tests use isolated environments with:
- In-memory test database
- Mocked external services
- Automated test data seeding
- Comprehensive error scenario testing

## Contributing

### Development Guidelines

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following the existing code style
4. **Add tests** for new functionality
5. **Run the test suite**: `npm run backend:test`
6. **Update documentation** if needed
7. **Submit a pull request**

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with TypeScript rules
- **Prettier**: Code formatting (configured in ESLint)
- **Zod**: Runtime validation for all API inputs/outputs
- **tRPC**: Type-safe API procedures
- **Prisma**: Type-safe database operations

### Commit Guidelines

- Use conventional commit messages
- Include tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting

## Documentation

### Setup and Deployment
- [Docker Setup Guide](DOCKER.md) - Comprehensive Docker documentation
- [Deployment Guide](DEPLOYMENT.md) - Production deployment and cloud deployment strategies
- [Backend Documentation](backend/README.md) - Backend-specific documentation

### API Documentation
- [API Usage Examples](API_EXAMPLES.md) - Comprehensive API usage examples and code samples
- [Health Endpoints](backend/docs/health-endpoints.md) - Health check documentation
- [OpenAPI Documentation](backend/docs/openapi.md) - API documentation generation
- [Versioning Implementation](backend/VERSIONING_IMPLEMENTATION.md) - API versioning details

### Development
- [Contributing Guidelines](CONTRIBUTING.md) - Development workflow and contribution guidelines

## License

MIT
