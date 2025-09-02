import request from 'supertest';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiService } from '../services/openApiService';
import { appRouter } from '../trpc/router';
import { 
  createSwaggerMiddleware, 
  serveOpenApiJson, 
  serveOpenApiStats, 
  clearOpenApiCache 
} from '../middleware/swagger';

describe('OpenAPI Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a minimal Express app for testing
    app = express();
    app.use(express.json());

    // Add OpenAPI endpoints
    app.get('/api/docs/openapi.json', serveOpenApiJson);
    app.get('/api/docs/stats', serveOpenApiStats);
    app.delete('/api/docs/cache', clearOpenApiCache);

    // Add Swagger UI
    app.use('/api/docs', swaggerUi.serve);
    app.get('/api/docs', ...createSwaggerMiddleware());

    // Mock getCurrentRouter to return our test router
    jest.mock('../trpc/server', () => ({
      getCurrentRouter: () => appRouter,
    }));
  });

  describe('OpenAPI JSON Endpoint', () => {
    it('should serve OpenAPI JSON document', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toBeDefined();
      expect(response.body.openapi).toBe('3.0.3');
      expect(response.body.info).toBeDefined();
      expect(response.body.info.title).toBe('Backend API');
      expect(response.body.paths).toBeDefined();
      expect(response.body.components).toBeDefined();

      // Check response headers
      expect(response.headers['x-generated-at']).toBeDefined();
      expect(response.headers['x-document-version']).toBe('1.0.0');
      expect(response.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include health endpoint in OpenAPI document', async () => {
      const response = await request(app)
        .get('/api/docs/openapi.json')
        .expect(200);

      expect(response.body.paths['/health']).toBeDefined();
      expect(response.body.paths['/health'].get).toBeDefined();
      expect(response.body.paths['/health'].get.summary).toBe('Health check');
      expect(response.body.paths['/health'].get.tags).toContain('Health');
    });
  });

  describe('OpenAPI Stats Endpoint', () => {
    it('should serve OpenAPI statistics', async () => {
      const response = await request(app)
        .get('/api/docs/stats')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('paths');
      expect(response.body.data).toHaveProperty('schemas');
      expect(response.body.data).toHaveProperty('tags');
      expect(response.body.data).toHaveProperty('servers');
      expect(response.body.data).toHaveProperty('lastGenerated');
      expect(response.body.data).toHaveProperty('isCached');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache in development mode', async () => {
      // Ensure we're not in production mode
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const response = await request(app)
          .delete('/api/docs/cache')
          .expect(200)
          .expect('Content-Type', /application\/json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toContain('cleared successfully');
        expect(response.body.data.clearedAt).toBeDefined();
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should reject cache clearing in production mode', async () => {
      // Temporarily set NODE_ENV to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const response = await request(app)
          .delete('/api/docs/cache')
          .expect(403)
          .expect('Content-Type', /application\/json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FORBIDDEN');
        expect(response.body.error.message).toContain('not allowed in production');
      } finally {
        // Restore original NODE_ENV
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Swagger UI', () => {
    it('should serve Swagger UI HTML', async () => {
      const response = await request(app)
        .get('/api/docs/')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('Backend API Documentation');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAPI generation errors gracefully', async () => {
      // Mock the service to throw an error
      const originalGenerate = openApiService.generateDocument;
      openApiService.generateDocument = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        const response = await request(app)
          .get('/api/docs/openapi.json')
          .expect(500)
          .expect('Content-Type', /application\/json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('OPENAPI_GENERATION_ERROR');
        expect(response.body.error.message).toContain('Failed to generate OpenAPI document');
      } finally {
        // Restore original method
        openApiService.generateDocument = originalGenerate;
      }
    });

    it('should handle stats generation errors gracefully', async () => {
      // Mock the service to throw an error
      const originalGenerate = openApiService.generateDocument;
      openApiService.generateDocument = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      try {
        const response = await request(app)
          .get('/api/docs/stats')
          .expect(500)
          .expect('Content-Type', /application\/json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('OPENAPI_STATS_ERROR');
        expect(response.body.error.message).toContain('Failed to get OpenAPI statistics');
      } finally {
        // Restore original method
        openApiService.generateDocument = originalGenerate;
      }
    });
  });
});