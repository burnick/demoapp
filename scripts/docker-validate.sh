#!/bin/bash

# Docker Validation Script
# This script validates the Docker setup and configuration

set -e

echo "🐳 Docker Configuration Validation"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Check if Docker Compose is installed (V2 syntax)
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose V2 is not available"
    echo "💡 Make sure you have Docker Desktop or Docker Compose V2 installed"
    exit 1
fi

echo "✅ Docker and Docker Compose V2 are available"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "📝 Please review and update the .env file with your configuration"
    else
        echo "❌ .env.example file not found"
        exit 1
    fi
else
    echo "✅ .env file exists"
fi

# Validate required environment variables
echo "🔍 Validating environment variables..."

required_vars=("DB_USERNAME" "DB_PASSWORD" "DB_NAME" "JWT_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo "📝 Please add these variables to your .env file"
    exit 1
fi

echo "✅ All required environment variables are present"

# Check Docker daemon
if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "💡 Please start Docker Desktop or the Docker daemon"
    exit 1
fi

echo "✅ Docker daemon is running"

# Validate docker-compose.yml syntax
if ! docker compose config &> /dev/null; then
    echo "❌ docker-compose.yml has syntax errors"
    echo "🔧 Run 'docker compose config' to see the errors"
    exit 1
fi

echo "✅ docker-compose.yml syntax is valid"

# Check if required directories exist
required_dirs=("backend" "data")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Required directory '$dir' not found"
        exit 1
    fi
done

echo "✅ All required directories exist"

# Check if Dockerfile exists
if [ ! -f "backend/Dockerfile" ]; then
    echo "❌ backend/Dockerfile not found"
    exit 1
fi

echo "✅ Dockerfile exists"

echo ""
echo "🎉 Docker configuration validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review your .env file configuration"
echo "2. Run 'npm run dev' for development environment"
echo "3. Run 'npm run prod' for production environment"
echo ""
echo "For more information, see DOCKER.md"