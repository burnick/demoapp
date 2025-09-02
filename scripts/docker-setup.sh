#!/bin/bash

# Docker Setup Helper Script
# Helps developers choose and configure the right Docker environment

set -e

echo "🐳 Docker Environment Setup"
echo "=========================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo "⚠️  Please review and update the .env file with your configuration"
        echo ""
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# Ask user for environment choice
echo "Which environment would you like to set up?"
echo "1) Development (hot reload, debugging, development tools)"
echo "2) Production (optimized, minimal, production-ready)"
echo "3) Both (build both environments)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🔧 Setting up Development Environment..."
        echo "======================================"
        
        # Build development image
        echo "📦 Building development Docker image..."
        cd backend && npm run docker:build:dev
        cd ..
        
        # Start development environment
        echo "🚀 Starting development environment..."
        npm run dev
        
        echo ""
        echo "✅ Development environment is ready!"
        echo "📍 Backend API: http://localhost:3000"
        echo "🏥 Health Check: http://localhost:3000/api/health"
        echo "📚 API Docs: http://localhost:3000/api/docs"
        echo "🐘 PostgreSQL: localhost:5432"
        echo "🔴 Redis: localhost:6379"
        echo "🔍 Elasticsearch: http://localhost:9200"
        echo ""
        echo "💡 View logs: npm run dev:logs"
        echo "🛑 Stop: npm run dev:down"
        ;;
        
    2)
        echo ""
        echo "🏭 Setting up Production Environment..."
        echo "====================================="
        
        # Validate production environment
        echo "🔍 Validating production configuration..."
        
        # Check for required production variables
        if ! grep -q "JWT_SECRET=" .env || grep -q "your-super-secret-jwt-key-change-this-in-production" .env; then
            echo "⚠️  WARNING: Please update JWT_SECRET in .env file for production!"
            echo "   Generate a secure secret: openssl rand -base64 32"
        fi
        
        if ! grep -q "DB_PASSWORD=" .env || grep -q "password" .env; then
            echo "⚠️  WARNING: Please update DB_PASSWORD in .env file for production!"
        fi
        
        # Build and start production environment
        echo "📦 Building and starting production environment..."
        npm run prod
        
        echo ""
        echo "✅ Production environment is ready!"
        echo "📍 Backend API: http://localhost:3000"
        echo "🏥 Health Check: http://localhost:3000/api/health"
        echo ""
        echo "💡 View logs: npm run prod:logs"
        echo "🛑 Stop: npm run prod:down"
        ;;
        
    3)
        echo ""
        echo "🔧 Building Both Environments..."
        echo "==============================="
        
        # Build development image
        echo "📦 Building development image..."
        cd backend && npm run docker:build:dev
        
        # Build production image
        echo "📦 Building production image..."
        npm run docker:build:prod
        cd ..
        
        echo ""
        echo "✅ Both environments are built!"
        echo ""
        echo "To start development: npm run dev"
        echo "To start production:  npm run prod"
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again and choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
echo "📖 For more information, see DOCKER.md"