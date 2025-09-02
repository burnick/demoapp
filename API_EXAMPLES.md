# API Usage Examples

This document provides comprehensive examples of how to use the Backend API endpoints.

## Authentication Examples

### User Registration (V1)

```bash
curl -X POST http://localhost:3000/trpc/v1.auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2023-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here",
    "expiresIn": 604800
  }
}
```

### Enhanced Registration (V2)

```bash
curl -X POST http://localhost:3000/trpc/v2.auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe",
    "preferences": {
      "theme": "dark",
      "language": "en",
      "notifications": {
        "email": true,
        "push": false,
        "sms": false
      },
      "privacy": {
        "profileVisibility": "public",
        "showEmail": false,
        "showActivity": true
      }
    },
    "metadata": {
      "source": "web",
      "referrer": "google",
      "campaign": "spring2023"
    }
  }'
```

### User Login

```bash
curl -X POST http://localhost:3000/trpc/v1.auth.login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### Enhanced Login with Device Tracking (V2)

```bash
curl -X POST http://localhost:3000/trpc/v2.auth.login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123",
    "rememberMe": true,
    "deviceInfo": {
      "userAgent": "Mozilla/5.0...",
      "platform": "web",
      "deviceId": "device-fingerprint-hash"
    },
    "location": {
      "ip": "192.168.1.1",
      "country": "US",
      "city": "New York"
    }
  }'
```

### Setup Multi-Factor Authentication (V2)

```bash
curl -X POST http://localhost:3000/trpc/v2.auth.setupMfa \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "method": "totp",
    "phoneNumber": "+1234567890"
  }'
```

### Token Refresh

```bash
curl -X POST http://localhost:3000/trpc/v1.auth.refreshToken \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

## User Management Examples

### List Users

```bash
curl -X GET "http://localhost:3000/trpc/v1.users.list?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

### Enhanced User Listing (V2)

```bash
curl -X GET "http://localhost:3000/trpc/v2.users.list?page=1&limit=10&sortBy=createdAt&sortOrder=desc&includeInactive=false" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-here",
        "email": "user@example.com",
        "name": "John Doe",
        "preferences": {
          "theme": "dark",
          "language": "en"
        },
        "metadata": {
          "source": "web",
          "lastLogin": "2023-01-01T00:00:00.000Z"
        },
        "tags": ["premium", "early-adopter"],
        "status": "active",
        "statistics": {
          "loginCount": 42,
          "reputation": 150
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Get User by ID

```bash
curl -X GET http://localhost:3000/trpc/v1.users.getById \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user-uuid-here"
  }'
```

### Create User

```bash
curl -X POST http://localhost:3000/trpc/v1.users.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "email": "newuser@example.com",
    "password": "securePassword123",
    "name": "Jane Smith"
  }'
```

### Enhanced User Creation (V2)

```bash
curl -X POST http://localhost:3000/trpc/v2.users.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "email": "newuser@example.com",
    "password": "securePassword123",
    "name": "Jane Smith",
    "preferences": {
      "theme": "light",
      "language": "es",
      "notifications": {
        "email": true,
        "push": true,
        "sms": false
      }
    },
    "tags": ["new-user", "spanish"],
    "status": "active",
    "metadata": {
      "source": "mobile-app",
      "referrer": "friend-invite"
    }
  }'
```

### Bulk User Operations (V2)

```bash
curl -X POST http://localhost:3000/trpc/v2.users.bulkOperations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "userIds": ["uuid1", "uuid2", "uuid3"],
    "operation": "activate",
    "reason": "Bulk activation after verification"
  }'
```

### User Analytics (V2)

```bash
curl -X GET "http://localhost:3000/trpc/v2.users.analytics?startDate=2023-01-01&endDate=2023-12-31&metrics=registrations,logins,activity" \
  -H "Authorization: Bearer your-jwt-token"
```

### Advanced User Search

```bash
curl -X GET http://localhost:3000/trpc/v1.users.advancedSearch \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "john",
    "filters": {
      "status": ["active"],
      "createdAfter": "2023-01-01T00:00:00.000Z"
    },
    "sortBy": "name",
    "sortOrder": "asc",
    "page": 1,
    "limit": 20
  }'
```

### Enhanced Search with Facets (V2)

```bash
curl -X GET http://localhost:3000/trpc/v2.users.advancedSearch \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "developer",
    "filters": {
      "tags": ["premium"],
      "status": ["active", "pending"],
      "preferences.language": "en"
    },
    "facets": ["tags", "status", "preferences.theme"],
    "sortBy": "statistics.reputation",
    "sortOrder": "desc",
    "page": 1,
    "limit": 20
  }'
```

## Health Check Examples

### Basic Health Check

```bash
curl -X GET http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "service": "backend-api",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "database": {
      "status": "healthy",
      "responseTime": 10
    },
    "cache": {
      "status": "healthy",
      "responseTime": 5
    },
    "search": {
      "status": "healthy",
      "responseTime": 15
    }
  }
}
```

### Readiness Check

```bash
curl -X GET http://localhost:3000/api/health/ready
```

### Liveness Check

```bash
curl -X GET http://localhost:3000/api/health/live
```

## API Versioning Examples

### Using Version Headers

```bash
# Request V1 API using header
curl -X GET http://localhost:3000/trpc/users.list \
  -H "Accept-Version: v1" \
  -H "Authorization: Bearer your-jwt-token"

# Request V2 API using header
curl -X GET http://localhost:3000/trpc/users.list \
  -H "API-Version: v2" \
  -H "Authorization: Bearer your-jwt-token"
```

### Version Information

```bash
curl -X GET http://localhost:3000/api/versions
```

**Response:**
```json
{
  "versions": [
    {
      "version": "v1",
      "status": "stable",
      "deprecated": false,
      "supportedUntil": "2024-12-31"
    },
    {
      "version": "v2",
      "status": "stable",
      "deprecated": false,
      "features": ["enhanced-auth", "bulk-operations", "analytics"]
    }
  ],
  "current": "v2",
  "default": "v1"
}
```

## Error Handling Examples

### Validation Error

```bash
curl -X POST http://localhost:3000/trpc/v1.auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "123"
  }'
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

### Authentication Error

```bash
curl -X GET http://localhost:3000/trpc/v1.users.profile \
  -H "Authorization: Bearer invalid-token"
```

**Response:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## JavaScript/TypeScript Client Examples

### Using tRPC Client

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/src/trpc/router';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers: {
        Authorization: 'Bearer your-jwt-token',
      },
    }),
  ],
});

// Register user
const registerResult = await client.v1.auth.register.mutate({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
});

// Login user
const loginResult = await client.v1.auth.login.mutate({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Get user profile
const profile = await client.v1.users.profile.query();

// List users with pagination
const users = await client.v1.users.list.query({
  page: 1,
  limit: 10,
});

// Enhanced V2 features
const enhancedUsers = await client.v2.users.list.query({
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});
```

### Using Fetch API

```typescript
// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`http://localhost:3000/trpc/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your-jwt-token',
      ...options.headers,
    },
    ...options,
  });
  
  return response.json();
}

// Register user
const registerUser = async (userData: any) => {
  return apiCall('v1.auth.register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

// Get user profile
const getUserProfile = async () => {
  return apiCall('v1.users.profile');
};

// Search users
const searchUsers = async (searchParams: any) => {
  return apiCall('v1.users.advancedSearch', {
    method: 'POST',
    body: JSON.stringify(searchParams),
  });
};
```

## Testing Examples

### Using curl for Testing

```bash
#!/bin/bash

# Test script for API endpoints
BASE_URL="http://localhost:3000"
TOKEN=""

# Register a test user
echo "Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/trpc/v1.auth.register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testPassword123",
    "name": "Test User"
  }')

# Extract token from response
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.token')

# Test authenticated endpoints
echo "Testing user profile..."
curl -s -X GET "$BASE_URL/trpc/v1.users.profile" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Testing user list..."
curl -s -X GET "$BASE_URL/trpc/v1.users.list?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "Testing health check..."
curl -s -X GET "$BASE_URL/api/health" | jq
```

### Using Postman Collection

Create a Postman collection with the following structure:

1. **Environment Variables**:
   - `baseUrl`: `http://localhost:3000`
   - `token`: `{{token}}` (will be set by login request)

2. **Pre-request Scripts** (for login):
   ```javascript
   // Set token from login response
   if (pm.response.json().success) {
     pm.environment.set("token", pm.response.json().data.token);
   }
   ```

3. **Authorization Header**:
   ```
   Authorization: Bearer {{token}}
   ```

## Rate Limiting Examples

The API includes rate limiting. Here's how to handle rate limit responses:

```bash
# This request might be rate limited
curl -X GET http://localhost:3000/trpc/v1.users.list \
  -H "Authorization: Bearer your-jwt-token" \
  -i  # Include headers to see rate limit info
```

**Rate Limited Response:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 900

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later."
  }
}
```

## WebSocket Examples (if implemented)

```typescript
// Example WebSocket connection for real-time features
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Authenticate WebSocket connection
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Subscribe to user events
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'user-events'
}));
```

This comprehensive guide covers all major API endpoints and usage patterns. For more detailed information about specific endpoints, refer to the interactive API documentation at `http://localhost:3000/api/docs`.