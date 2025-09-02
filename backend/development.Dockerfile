# Development Dockerfile optimized for hot reloading and development workflow
# Use: docker build -f development.Dockerfile .

FROM node:18-alpine

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    bash

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# For development, we'll run as root to avoid permission issues with volume mounts
# This is acceptable for local development environments
# Production Dockerfile uses non-root user for security

# Expose port and debug port
EXPOSE 3000 9229

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Default command for development (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]