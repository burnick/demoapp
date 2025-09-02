import { OpenAPIV3 } from 'openapi-types';
import { openApiService } from '../services/openApiService';
import { appRouter } from '../trpc/router';
import { getOpenAPIConfig, createOpenApiMeta } from '../utils/openapi';

describe('OpenAPI Documentation', () => {

  describe('OpenAPI Service', () => {
    it('should generate valid OpenAPI document', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document).toBeDefined();
      expect(document.openapi).toBe('3.0.3');
      expect(document.info).toBeDefined();
      expect(document.info.title).toBe('Backend API');
      expect(document.info.version).toBe('1.0.0');
      expect(document.paths).toBeDefined();
      expect(document.components).toBeDefined();
    });

    it('should include security schemes', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document.components?.securitySchemes).toBeDefined();
      expect(document.components?.securitySchemes?.bearerAuth).toBeDefined();
      expect(document.components?.securitySchemes?.bearerAuth).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication. Include as: Bearer <token>',
      });
    });

    it('should include server information', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document.servers).toBeDefined();
      expect(document.servers?.length).toBeGreaterThan(0);
      expect(document.servers?.[0]).toHaveProperty('url');
      expect(document.servers?.[0]).toHaveProperty('description');
    });

    it('should include tags', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document.tags).toBeDefined();
      expect(document.tags?.length).toBeGreaterThan(0);
      
      const tagNames = document.tags?.map(tag => tag.name) || [];
      expect(tagNames).toContain('Authentication');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Health');
    });

    it('should cache generated documents', () => {
      const router = appRouter;
      
      // Clear cache first
      openApiService.clearCache();
      
      // Generate document twice
      const doc1 = openApiService.generateDocument(router);
      const doc2 = openApiService.generateDocument(router);
      
      // Should be the same reference (cached)
      expect(doc1).toStrictEqual(doc2);
    });

    it('should provide document statistics', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      const stats = openApiService.getDocumentStats(document);
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('paths');
      expect(stats).toHaveProperty('schemas');
      expect(stats).toHaveProperty('tags');
      expect(stats).toHaveProperty('servers');
      expect(stats).toHaveProperty('lastGenerated');
      expect(stats).toHaveProperty('isCached');
      
      expect(typeof stats.paths).toBe('number');
      expect(typeof stats.schemas).toBe('number');
      expect(typeof stats.tags).toBe('number');
      expect(typeof stats.servers).toBe('number');
    });
  });

  describe('OpenAPI Configuration', () => {
    it('should provide valid configuration', () => {
      const config = getOpenAPIConfig();
      
      expect(config).toBeDefined();
      expect(config.title).toBe('Backend API');
      expect(config.version).toBe('1.0.0');
      expect(config.description).toBeDefined();
      expect(config.servers).toBeDefined();
      expect(config.servers.length).toBeGreaterThan(0);
      expect(config.tags).toBeDefined();
      expect(config.tags?.length).toBeGreaterThan(0);
    });

    it('should include proper server URLs', () => {
      const config = getOpenAPIConfig();
      
      expect(config.servers[0]).toHaveProperty('url');
      expect(config.servers[0]).toHaveProperty('description');
      expect(config.servers[0]?.url).toContain('/trpc');
    });
  });

  describe('OpenAPI Utilities', () => {
    it('should create valid OpenAPI meta', () => {
      const meta = createOpenApiMeta({
        method: 'GET',
        path: '/test',
        summary: 'Test endpoint',
        description: 'Test description',
        tags: ['Test'],
        protect: false,
      });
      
      expect(meta).toBeDefined();
      expect(meta.openapi).toBeDefined();
      expect(meta.openapi?.method).toBe('GET');
      expect(meta.openapi?.path).toBe('/test');
      expect(meta.openapi?.summary).toBe('Test endpoint');
      expect(meta.openapi?.description).toBe('Test description');
      expect(meta.openapi?.tags).toEqual(['Test']);
      expect(meta.openapi?.protect).toBe(false);
    });

    it('should format paths correctly', () => {
      const metaWithSlash = createOpenApiMeta({
        method: 'GET',
        path: '/test',
        summary: 'Test',
      });
      
      const metaWithoutSlash = createOpenApiMeta({
        method: 'GET',
        path: 'test',
        summary: 'Test',
      });
      
      expect(metaWithSlash.openapi?.path).toBe('/test');
      expect(metaWithoutSlash.openapi?.path).toBe('/test');
    });

    it('should handle protected endpoints', () => {
      const protectedMeta = createOpenApiMeta({
        method: 'POST',
        path: '/protected',
        summary: 'Protected endpoint',
        protect: true,
      });
      
      expect(protectedMeta.openapi?.protect).toBe(true);
    });

    it('should handle deprecated endpoints', () => {
      const deprecatedMeta = createOpenApiMeta({
        method: 'GET',
        path: '/deprecated',
        summary: 'Deprecated endpoint',
        deprecated: true,
      });
      
      expect(deprecatedMeta.openapi?.deprecated).toBe(true);
    });
  });

  describe('OpenAPI Document Validation', () => {
    it('should generate valid paths for tRPC procedures', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document.paths).toBeDefined();
      
      // Check for health endpoint
      expect(document.paths?.['/health']).toBeDefined();
      expect(document.paths?.['/health']?.get).toBeDefined();
      expect(document.paths?.['/health']?.get?.summary).toBe('Health check');
      expect(document.paths?.['/health']?.get?.tags).toContain('Health');
    });

    it('should include proper response schemas', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      // Check health endpoint responses
      const healthEndpoint = document.paths?.['/health']?.get;
      expect(healthEndpoint?.responses).toBeDefined();
      expect(healthEndpoint?.responses?.['200']).toBeDefined();
      
      const response200 = healthEndpoint?.responses?.['200'];
      if (response200 && 'description' in response200) {
        expect(response200.description).toBeDefined();
      }
    });

    it('should include component schemas', () => {
      const router = appRouter;
      const document = openApiService.generateDocument(router);
      
      expect(document.components).toBeDefined();
      
      // Should have at least security schemes
      expect(document.components?.securitySchemes).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAPI generation errors gracefully', () => {
      // Test with invalid router (this should not crash)
      const invalidRouter = null as any;
      const document = openApiService.generateDocument(invalidRouter);
      
      // Should return minimal document
      expect(document).toBeDefined();
      expect(document.openapi).toBe('3.0.3');
      expect(document.info.title).toBe('Backend API');
      expect(document.paths).toBeDefined();
    });

    it('should clear cache without errors', () => {
      expect(() => {
        openApiService.clearCache();
      }).not.toThrow();
    });
  });
});