import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory, TestAssertions, MockDataGenerator, TestEnvironment } from './testUtils';
import { testPrisma } from './setup';

// Import the app factory
import { createApp } from '../server';

describe('API Integration Tests', () => {
  let app: Express;
  let server: any;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Ensure we're in test environment
    if (!TestEnvironment.isTestEnvironment()) {
      throw new Error('Integration tests must run in test environment');
    }

    // Create app instance
    app = createApp();
    prisma = testPrisma;

    // Start server on test port
    server = app.listen(process.env.PORT || 3001);
  });

  afterAll(async () => {
    // Close server
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await TestDataFactory.cleanup();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/health/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
    });
  });

  describe('User API Endpoints', () => {
    describe('POST /api/v1/users', () => {
      it('should create a new user', async () => {
        const userData = MockDataGenerator.generateUserData();

        const response = await request(app)
          .post('/api/v1/users')
          .send(userData)
          .expect(201);

        TestAssertions.assertApiResponse(response.body);
        TestAssertions.assertUserSafeStructure(response.body.data);
        expect(response.body.data.email).toBe(userData.email);
        expect(response.body.data.name).toBe(userData.name);
      });

      it('should return 400 for invalid user data', async () => {
        const invalidData = { email: 'invalid-email', name: '' };

        const response = await request(app)
          .post('/api/v1/users')
          .send(invalidData)
          .expect(400);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 409 for duplicate email', async () => {
        const userData = MockDataGenerator.generateUserData();
        
        // Create user first
        await TestDataFactory.createUser({
          email: userData.email,
          name: userData.name,
        });

        const response = await request(app)
          .post('/api/v1/users')
          .send(userData)
          .expect(409);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('CONFLICT_ERROR');
      });
    });

    describe('GET /api/v1/users/:id', () => {
      it('should get user by ID', async () => {
        const user = await TestDataFactory.createUser();

        const response = await request(app)
          .get(`/api/v1/users/${user.id}`)
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        TestAssertions.assertUserSafeStructure(response.body.data);
        expect(response.body.data.id).toBe(user.id);
        expect(response.body.data.email).toBe(user.email);
      });

      it('should return 404 for non-existent user', async () => {
        const nonExistentId = TestEnvironment.generateTestId();

        const response = await request(app)
          .get(`/api/v1/users/${nonExistentId}`)
          .expect(404);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
      });

      it('should return 400 for invalid user ID format', async () => {
        const response = await request(app)
          .get('/api/v1/users/invalid-id')
          .expect(400);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('GET /api/v1/users', () => {
      it('should list users with pagination', async () => {
        // Create test users
        await TestDataFactory.createUsers(5);

        const response = await request(app)
          .get('/api/v1/users')
          .query({ page: 1, limit: 3 })
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        TestAssertions.assertPaginatedResponse(response.body.data);
        expect(response.body.data.users).toHaveLength(3);
        expect(response.body.data.total).toBe(5);
        expect(response.body.data.page).toBe(1);
        expect(response.body.data.limit).toBe(3);
        expect(response.body.data.hasNext).toBe(true);
        expect(response.body.data.hasPrev).toBe(false);
      });

      it('should search users by email and name', async () => {
        await TestDataFactory.createUser({
          email: 'john.doe@example.com',
          name: 'John Doe',
        });
        await TestDataFactory.createUser({
          email: 'jane.smith@example.com',
          name: 'Jane Smith',
        });

        const response = await request(app)
          .get('/api/v1/users')
          .query({ search: 'john' })
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data.users).toHaveLength(1);
        expect(response.body.data.users[0].email).toBe('john.doe@example.com');
      });

      it('should sort users by different fields', async () => {
        const user1 = await TestDataFactory.createUser({ name: 'Alice' });
        const user2 = await TestDataFactory.createUser({ name: 'Bob' });
        
        // Wait a bit to ensure different timestamps
        await TestEnvironment.wait(10);
        const user3 = await TestDataFactory.createUser({ name: 'Charlie' });

        // Sort by name ascending
        const nameResponse = await request(app)
          .get('/api/v1/users')
          .query({ sortBy: 'name', order: 'asc' })
          .expect(200);

        expect(nameResponse.body.data.users[0].name).toBe('Alice');
        expect(nameResponse.body.data.users[1].name).toBe('Bob');
        expect(nameResponse.body.data.users[2].name).toBe('Charlie');

        // Sort by createdAt descending (default)
        const dateResponse = await request(app)
          .get('/api/v1/users')
          .query({ sortBy: 'createdAt', order: 'desc' })
          .expect(200);

        expect(dateResponse.body.data.users[0].id).toBe(user3.id);
      });
    });

    describe('PUT /api/v1/users/:id', () => {
      it('should update user successfully', async () => {
        const user = await TestDataFactory.createUser();
        const updateData = { name: 'Updated Name' };

        const response = await request(app)
          .put(`/api/v1/users/${user.id}`)
          .send(updateData)
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        TestAssertions.assertUserSafeStructure(response.body.data);
        expect(response.body.data.name).toBe('Updated Name');
        expect(response.body.data.email).toBe(user.email);
      });

      it('should return 404 for non-existent user', async () => {
        const nonExistentId = TestEnvironment.generateTestId();
        const updateData = { name: 'Updated Name' };

        const response = await request(app)
          .put(`/api/v1/users/${nonExistentId}`)
          .send(updateData)
          .expect(404);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
      });

      it('should return 409 for email conflict', async () => {
        const user1 = await TestDataFactory.createUser();
        const user2 = await TestDataFactory.createUser();

        const response = await request(app)
          .put(`/api/v1/users/${user1.id}`)
          .send({ email: user2.email })
          .expect(409);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('CONFLICT_ERROR');
      });
    });

    describe('DELETE /api/v1/users/:id', () => {
      it('should delete user successfully', async () => {
        const user = await TestDataFactory.createUser();

        const response = await request(app)
          .delete(`/api/v1/users/${user.id}`)
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data.message).toBe('User deleted successfully');

        // Verify user is deleted
        const deletedUser = await prisma.user.findUnique({
          where: { id: user.id },
        });
        expect(deletedUser).toBeNull();
      });

      it('should return 404 for non-existent user', async () => {
        const nonExistentId = TestEnvironment.generateTestId();

        const response = await request(app)
          .delete(`/api/v1/users/${nonExistentId}`)
          .expect(404);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
      });
    });

    describe('POST /api/v1/users/bulk-delete', () => {
      it('should delete multiple users successfully', async () => {
        const users = await TestDataFactory.createUsers(3);
        const userIds = users.map(user => user.id);

        const response = await request(app)
          .post('/api/v1/users/bulk-delete')
          .send({ userIds })
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data.count).toBe(3);

        // Verify users are deleted
        const remainingUsers = await prisma.user.findMany({
          where: { id: { in: userIds } },
        });
        expect(remainingUsers).toHaveLength(0);
      });

      it('should return 404 if some users do not exist', async () => {
        const user = await TestDataFactory.createUser();
        const nonExistentId = TestEnvironment.generateTestId();

        const response = await request(app)
          .post('/api/v1/users/bulk-delete')
          .send({ userIds: [user.id, nonExistentId] })
          .expect(404);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
      });
    });

    describe('GET /api/v1/users/search', () => {
      it('should search users successfully', async () => {
        await TestDataFactory.createUser({
          email: 'developer@example.com',
          name: 'Developer User',
        });
        await TestDataFactory.createUser({
          email: 'designer@example.com',
          name: 'Designer User',
        });

        const response = await request(app)
          .get('/api/v1/users/search')
          .query({ q: 'developer' })
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].email).toBe('developer@example.com');
      });

      it('should return 400 for empty search query', async () => {
        const response = await request(app)
          .get('/api/v1/users/search')
          .query({ q: '' })
          .expect(400);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });

  describe('Authentication API Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
      it('should register user successfully', async () => {
        const registerData = MockDataGenerator.generateRegisterData();

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(registerData)
          .expect(201);

        TestAssertions.assertApiResponse(response.body);
        TestAssertions.assertUserSafeStructure(response.body.data.user);
        expect(response.body.data.user.email).toBe(registerData.email);
        expect(response.body.data.message).toBe('User registered successfully');
      });

      it('should return 400 for invalid registration data', async () => {
        const invalidData = {
          email: 'invalid-email',
          name: '',
          password: '123',
          confirmPassword: '456',
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(invalidData)
          .expect(400);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return 409 for existing email', async () => {
        const userData = MockDataGenerator.generateRegisterData();
        
        // Create user first
        await TestDataFactory.createUser({
          email: userData.email,
          name: userData.name,
        });

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(userData)
          .expect(409);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('CONFLICT_ERROR');
      });
    });

    describe('POST /api/v1/auth/login', () => {
      it('should login successfully', async () => {
        const password = 'Password123!';
        const user = await TestDataFactory.createUser({ password });
        
        const loginData = {
          email: user.email,
          password: 'Password123!', // Use plain password for login
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data).toHaveProperty('tokens');
        expect(response.body.data.tokens).toHaveProperty('accessToken');
        expect(response.body.data.tokens).toHaveProperty('refreshToken');
        expect(response.body.data.tokens).toHaveProperty('expiresAt');
        TestAssertions.assertUserSafeStructure(response.body.data.user);
      });

      it('should return 401 for invalid credentials', async () => {
        const loginData = MockDataGenerator.generateLoginData({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(401);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      });

      it('should return 400 for invalid login data', async () => {
        const invalidData = {
          email: 'invalid-email',
          password: '',
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(invalidData)
          .expect(400);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh token successfully', async () => {
        // First, login to get tokens
        const user = await TestDataFactory.createUser();
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'Password123!',
          });

        const { refreshToken } = loginResponse.body.data.tokens;

        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken })
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data).toHaveProperty('accessToken');
        expect(response.body.data).toHaveProperty('refreshToken');
        expect(response.body.data).toHaveProperty('expiresAt');
      });

      it('should return 401 for invalid refresh token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid-token' })
          .expect(401);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      });
    });

    describe('POST /api/v1/auth/change-password', () => {
      it('should change password successfully with valid token', async () => {
        const user = await TestDataFactory.createUser();
        
        // Login to get access token
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: user.email,
            password: 'Password123!',
          });

        const { accessToken } = loginResponse.body.data.tokens;

        const changePasswordData = {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        };

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(changePasswordData)
          .expect(200);

        TestAssertions.assertApiResponse(response.body);
        expect(response.body.data.message).toBe('Password changed successfully');
      });

      it('should return 401 without valid token', async () => {
        const changePasswordData = {
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!',
          confirmNewPassword: 'NewPassword123!',
        };

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .send(changePasswordData)
          .expect(401);

        TestAssertions.assertApiResponse(response.body, false);
        expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent')
        .expect(404);

      TestAssertions.assertApiResponse(response.body, false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      TestAssertions.assertApiResponse(response.body, false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle large payloads', async () => {
      const largeData = {
        email: 'test@example.com',
        name: 'A'.repeat(10000), // Very long name
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(largeData)
        .expect(400);

      TestAssertions.assertApiResponse(response.body, false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple requests within limits', async () => {
      const userData = MockDataGenerator.generateUserData();

      // Make multiple requests quickly
      const promises = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/v1/users')
          .send({
            ...userData,
            email: `test-${i}@example.com`,
          })
      );

      const responses = await Promise.all(promises);
      
      // All should succeed (assuming rate limit is higher than 5)
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/users')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
});