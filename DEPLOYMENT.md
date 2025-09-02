# Deployment Guide

This guide covers deployment strategies for the Backend API project across different environments.

## Table of Contents

- [Environment Overview](#environment-overview)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Monitoring and Logging](#monitoring-and-logging)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Environment Overview

The application supports multiple deployment environments:

- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

Each environment uses Docker containers for consistency and includes:
- Backend API (Node.js/TypeScript)
- PostgreSQL database
- Redis cache
- Elasticsearch search engine

## Docker Deployment

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd backend-api-project
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run prod
   ```

### Development Deployment

Development deployment includes hot reload and debugging capabilities:

```bash
# Start development environment
npm run dev

# View logs
npm run dev:logs

# Stop services
npm run dev:down
```

**Development Features:**
- Hot reload for code changes
- Debug port exposed (9229)
- Development dependencies included
- Verbose logging enabled
- Source maps enabled

### Production Deployment

Production deployment uses optimized builds and security hardening:

```bash
# Build and start production environment
npm run prod

# View production logs
npm run prod:logs

# Stop production environment
npm run prod:down
```

**Production Features:**
- Multi-stage Docker builds for smaller images
- Non-root user execution
- Optimized Node.js settings
- Health checks enabled
- Security headers configured

## Production Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose V2
- Minimum 2GB RAM
- Minimum 10GB disk space
- SSL certificates (for HTTPS)

### Step-by-Step Production Setup

1. **Server Preparation**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   ```

2. **Application Setup**:
   ```bash
   # Clone repository
   git clone <repository-url>
   cd backend-api-project
   
   # Create production environment file
   cp .env.example .env
   ```

3. **Configure Environment Variables**:
   ```bash
   # Edit .env with production values
   nano .env
   ```

   **Required Production Variables:**
   ```bash
   NODE_ENV=production
   DB_PASSWORD=<strong-database-password>
   JWT_SECRET=<strong-jwt-secret-minimum-32-characters>
   LOG_LEVEL=warn
   ```

4. **Start Production Services**:
   ```bash
   # Build and start
   npm run prod
   
   # Verify services are running
   docker compose ps
   
   # Check health
   curl http://localhost:3000/api/health
   ```

5. **Set up Reverse Proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### SSL/TLS Configuration

1. **Obtain SSL Certificate** (Let's Encrypt example):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **Update Nginx Configuration**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           # ... other proxy settings
       }
   }
   ```

## Cloud Deployment

### AWS Deployment

#### Using AWS ECS

1. **Create Task Definition**:
   ```json
   {
     "family": "backend-api",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "backend-api",
         "image": "your-registry/backend-api:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {
             "name": "NODE_ENV",
             "value": "production"
           }
         ],
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:database-url"
           }
         ],
         "healthCheck": {
           "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health/live || exit 1"],
           "interval": 30,
           "timeout": 5,
           "retries": 3
         }
       }
     ]
   }
   ```

2. **Create Service**:
   ```bash
   aws ecs create-service \
     --cluster production \
     --service-name backend-api \
     --task-definition backend-api:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-12345],securityGroups=[sg-12345],assignPublicIp=ENABLED}"
   ```

#### Using AWS RDS for Database

1. **Create RDS Instance**:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier backend-api-db \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --master-username postgres \
     --master-user-password <secure-password> \
     --allocated-storage 20 \
     --vpc-security-group-ids sg-12345
   ```

2. **Update Environment Variables**:
   ```bash
   DATABASE_URL=postgresql://postgres:<password>@backend-api-db.region.rds.amazonaws.com:5432/backend_db
   ```

### Google Cloud Platform

#### Using Cloud Run

1. **Build and Push Image**:
   ```bash
   # Build image
   docker build -t gcr.io/project-id/backend-api:latest .
   
   # Push to Container Registry
   docker push gcr.io/project-id/backend-api:latest
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy backend-api \
     --image gcr.io/project-id/backend-api:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-env-vars DATABASE_URL=<database-url>
   ```

### Azure Deployment

#### Using Container Instances

1. **Create Resource Group**:
   ```bash
   az group create --name backend-api-rg --location eastus
   ```

2. **Deploy Container**:
   ```bash
   az container create \
     --resource-group backend-api-rg \
     --name backend-api \
     --image your-registry/backend-api:latest \
     --dns-name-label backend-api-unique \
     --ports 3000 \
     --environment-variables NODE_ENV=production \
     --secure-environment-variables DATABASE_URL=<database-url>
   ```

## Environment Configuration

### Environment Variables

#### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://username:password@host:5432/database
DB_USERNAME=postgres
DB_PASSWORD=secure_password
DB_NAME=backend_db

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=warn
```

#### Optional Variables

```bash
# Redis (for caching)
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# Elasticsearch (for search)
ELASTICSEARCH_URL=http://elasticsearch:9201

# API Configuration
API_PREFIX=/api
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Checks
HEALTH_CHECK_TIMEOUT=5000
```

### Secrets Management

#### Using Docker Secrets

1. **Create Secrets**:
   ```bash
   echo "your-jwt-secret" | docker secret create jwt_secret -
   echo "database-password" | docker secret create db_password -
   ```

2. **Update docker-compose.yml**:
   ```yaml
   services:
     backend:
       secrets:
         - jwt_secret
         - db_password
       environment:
         JWT_SECRET_FILE: /run/secrets/jwt_secret
         DB_PASSWORD_FILE: /run/secrets/db_password
   
   secrets:
     jwt_secret:
       external: true
     db_password:
       external: true
   ```

#### Using AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name backend-api/jwt-secret \
  --secret-string "your-jwt-secret"

# Retrieve in application
const secret = await secretsManager.getSecretValue({
  SecretId: 'backend-api/jwt-secret'
}).promise();
```

## Database Setup

### PostgreSQL Configuration

#### Production Database Setup

1. **Create Database**:
   ```sql
   CREATE DATABASE backend_db;
   CREATE USER backend_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE backend_db TO backend_user;
   ```

2. **Configure Connection Pooling**:
   ```bash
   # In .env
   DATABASE_URL="postgresql://backend_user:secure_password@localhost:5432/backend_db?connection_limit=20&pool_timeout=20"
   ```

3. **Run Migrations**:
   ```bash
   npm run db:migrate:prod
   ```

#### Database Backup Strategy

1. **Automated Backups**:
   ```bash
   #!/bin/bash
   # backup-db.sh
   BACKUP_DIR="/backups"
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   
   pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
   
   # Keep only last 7 days of backups
   find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
   ```

2. **Schedule with Cron**:
   ```bash
   # Add to crontab
   0 2 * * * /path/to/backup-db.sh
   ```

### Redis Configuration

#### Production Redis Setup

1. **Configure Redis**:
   ```bash
   # redis.conf
   bind 127.0.0.1
   port 6379
   requirepass secure_redis_password
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   ```

2. **Update Environment**:
   ```bash
   REDIS_URL=redis://:secure_redis_password@localhost:6379
   ```

## Monitoring and Logging

### Health Monitoring

1. **Health Check Endpoints**:
   - `/api/health` - Comprehensive health check
   - `/api/health/ready` - Readiness probe
   - `/api/health/live` - Liveness probe

2. **Monitoring Setup** (Prometheus example):
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'backend-api'
       static_configs:
         - targets: ['localhost:3000']
       metrics_path: '/metrics'
   ```

### Logging Configuration

1. **Structured Logging**:
   ```bash
   # Production logging
   LOG_LEVEL=warn
   LOG_FORMAT=json
   ```

2. **Log Aggregation** (ELK Stack example):
   ```yaml
   # docker-compose.yml
   services:
     backend:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

### Application Performance Monitoring

1. **APM Integration** (New Relic example):
   ```javascript
   // Add to server.ts
   require('newrelic');
   ```

2. **Custom Metrics**:
   ```typescript
   // Track custom metrics
   const responseTime = Date.now() - startTime;
   logger.info('Request completed', {
     method: req.method,
     url: req.url,
     responseTime,
     statusCode: res.statusCode
   });
   ```

## Security Considerations

### Container Security

1. **Non-root User**:
   ```dockerfile
   # Dockerfile
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   USER nextjs
   ```

2. **Security Scanning**:
   ```bash
   # Scan for vulnerabilities
   docker scan your-image:latest
   ```

### Network Security

1. **Firewall Configuration**:
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

2. **Docker Network Isolation**:
   ```yaml
   # docker-compose.yml
   networks:
     backend:
       driver: bridge
       internal: true
     frontend:
       driver: bridge
   ```

### Application Security

1. **Environment Variables**:
   - Never commit secrets to version control
   - Use strong, unique passwords
   - Rotate secrets regularly

2. **Security Headers**:
   ```typescript
   // Already configured in the application
   app.use(helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
       },
     },
   }));
   ```

## Troubleshooting

### Common Issues

#### Container Won't Start

1. **Check Logs**:
   ```bash
   docker compose logs backend
   ```

2. **Common Causes**:
   - Missing environment variables
   - Database connection issues
   - Port conflicts
   - Insufficient resources

#### Database Connection Issues

1. **Test Connection**:
   ```bash
   # Test database connectivity
   docker compose exec backend npm run db:migrate
   ```

2. **Common Solutions**:
   - Verify DATABASE_URL format
   - Check database server status
   - Verify network connectivity
   - Check firewall rules

#### Performance Issues

1. **Monitor Resources**:
   ```bash
   # Check container resource usage
   docker stats
   ```

2. **Common Solutions**:
   - Increase container memory limits
   - Optimize database queries
   - Enable Redis caching
   - Scale horizontally

### Debugging Production Issues

1. **Enable Debug Logging**:
   ```bash
   # Temporarily increase log level
   docker compose exec backend sh -c 'LOG_LEVEL=debug npm start'
   ```

2. **Access Container Shell**:
   ```bash
   docker compose exec backend sh
   ```

3. **Check Application Metrics**:
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:3000/api/docs/stats
   ```

### Rollback Procedures

1. **Application Rollback**:
   ```bash
   # Stop current version
   docker compose down
   
   # Deploy previous version
   git checkout previous-tag
   docker compose up -d --build
   ```

2. **Database Rollback**:
   ```bash
   # Restore from backup
   psql $DATABASE_URL < backup_file.sql
   ```

## Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies**:
   ```bash
   # Update npm packages
   npm audit
   npm update
   
   # Update Docker images
   docker compose pull
   docker compose up -d
   ```

2. **Clean Up Resources**:
   ```bash
   # Remove unused Docker resources
   docker system prune -f
   
   # Clean up old logs
   docker compose exec backend find /app/logs -name "*.log" -mtime +30 -delete
   ```

3. **Database Maintenance**:
   ```bash
   # Analyze and vacuum database
   docker compose exec db psql -U postgres -d backend_db -c "ANALYZE; VACUUM;"
   ```

### Scaling Considerations

1. **Horizontal Scaling**:
   ```yaml
   # docker-compose.yml
   services:
     backend:
       deploy:
         replicas: 3
   ```

2. **Load Balancing**:
   ```nginx
   upstream backend {
       server backend-1:3000;
       server backend-2:3000;
       server backend-3:3000;
   }
   ```

This deployment guide provides comprehensive instructions for deploying the Backend API project in various environments. For specific deployment scenarios or issues, refer to the troubleshooting section or create an issue in the project repository.