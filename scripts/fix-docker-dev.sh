#!/bin/bash

# Fix Docker Development Environment Issues
# This script helps resolve common Docker development setup issues

set -e

echo "🔧 Docker Development Environment Fix"
echo "===================================="

# Check if docker-compose files exist
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

if [ ! -f docker-compose.dev.yml ]; then
    echo "❌ docker-compose.dev.yml not found"
    exit 1
fi

# Check if development.Dockerfile exists
if [ ! -f backend/development.Dockerfile ]; then
    echo "❌ backend/development.Dockerfile not found"
    echo "💡 Run the Docker containerization task to create this file"
    exit 1
fi

echo "✅ All required files found"

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml down 2>/dev/null || true

# Remove any conflicting images
echo "🧹 Cleaning up potentially conflicting images..."
docker image rm backend-api:dev 2>/dev/null || true
docker image rm demoapp-backend 2>/dev/null || true

# Validate docker-compose configuration
echo "🔍 Validating Docker Compose configuration..."
if ! docker compose -f docker-compose.yml -f docker-compose.dev.yml config >/dev/null 2>&1; then
    echo "❌ Docker Compose configuration is invalid"
    echo "🔧 Run 'npm run debug:config' to see the full configuration"
    exit 1
fi

echo "✅ Docker Compose configuration is valid"

# Build the development image
echo "📦 Building development image..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml build backend

# Start the development environment
echo "🚀 Starting development environment..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait a moment for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

echo ""
echo "✅ Development environment should now be running!"
echo "📍 Backend API: http://localhost:3000"
echo "🏥 Health Check: http://localhost:3000/api/health"
echo ""
echo "💡 View logs: npm run dev:logs"
echo "🛑 Stop: npm run dev:down"