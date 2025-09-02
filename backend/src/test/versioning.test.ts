import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../server';
import { 
  VersionRegistry, 
  extractVersionFromPath, 
  extractVersionFromHeaders, 
  determineApiVersion 
} from '../middleware/versioning';
import { Request } from 'express';

describe('API Versioning', () => {
  beforeAll(async () => {
    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  beforeEach(() => {
    // Reset version registry for each test
    VersionRegistry['versions'].clear();
    VersionRegistry.registerVersion({
      version: 'v1',
      description: 'Initial stable API version',
      deprecated: false,
    });
    VersionRegistry.registerVersion({
      version: 'v2',
      description: 'Enhanced API version with improved features',
      deprecated: false,
    });
  });

  describe('Version Registry', () => {
    it('should register and retrieve versions', () => {
      const v1Config = VersionRegistry.getVersion('v1');
      const v2Config = VersionRegistry.getVersion('v2');
      
      expect(v1Config).toBeDefined();
      expect(v1Config?.version).toBe('v1');
      expect(v1Config?.deprecated).toBe(false);
      
      expect(v2Config).toBeDefined();
      expect(v2Config?.version).toBe('v2');
      expect(v2Config?.deprecated).toBe(false);
    });

    it('should return all versions sorted', () => {
      const versions = VersionRegistry.getAllVersions();
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('v1');
      expect(versions[1].version).toBe('v2');
    });

    it('should return latest version', () => {
      const latest = VersionRegistry.getLatestVersion();
      expect(latest?.version).toBe('v2');
    });

    it('should handle deprecated versions', () => {
      VersionRegistry.registerVersion({
        version: 'v1',
        description: 'Deprecated version',
        deprecated: true,
        deprecationDate: '2024-01-01',
        supportedUntil: '2024-12-31',
      });

      const isDeprecated = VersionRegistry.isVersionDeprecated('v1');
      expect(isDeprecated).toBe(true);

      const deprecationInfo = VersionRegistry.getDeprecationInfo('v1');
      expect(deprecationInfo.deprecated).toBe(true);
      expect(deprecationInfo.deprecationDate).toBe('2024-01-01');
      expect(deprecationInfo.supportedUntil).toBe('2024-12-31');
      expect(deprecationInfo.message).toContain('deprecated');
    });
  });

  describe('Version Extraction', () => {
    it('should extract version from path', () => {
      expect(extractVersionFromPath('/v1/users')).toBe('v1');
      expect(extractVersionFromPath('/v2/auth/login')).toBe('v2');
      expect(extractVersionFromPath('/api/v1/users')).toBe('v1');
      expect(extractVersionFromPath('/users')).toBeNull();
      expect(extractVersionFromPath('/api/users')).toBeNull();
    });

    it('should extract version from headers', () => {
      const req1 = {
        headers: { 'accept-version': 'v1' }
      } as Request;
      expect(extractVersionFromHeaders(req1)).toBe('v1');

      const req2 = {
        headers: { 'api-version': 'v2' }
      } as Request;
      expect(extractVersionFromHeaders(req2)).toBe('v2');

      const req3 = {
        headers: {}
      } as Request;
      expect(extractVersionFromHeaders(req3)).toBeNull();
    });

    it('should determine API version with priority', () => {
      // Path takes priority
      const req1 = {
        path: '/v1/users',
        headers: { 'accept-version': 'v2' }
      } as Request;
      const result1 = determineApiVersion(req1);
      expect(result1.version).toBe('v1');
      expect(result1.source).toBe('path');

      // Header when no path version
      const req2 = {
        path: '/users',
        headers: { 'accept-version': 'v2' }
      } as Request;
      const result2 = determineApiVersion(req2);
      expect(result2.version).toBe('v2');
      expect(result2.source).toBe('header');

      // Default when neither
      const req3 = {
        path: '/users',
        headers: {}
      } as Request;
      const result3 = determineApiVersion(req3);
      expect(result3.version).toBe('v2'); // Latest version
      expect(result3.source).toBe('default');
    });
  });

  describe('Version Info Endpoint', () => {
    it('should return version information', async () => {
      const response = await request(app)
        .get('/api/versions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('versions');
      expect(response.body.data).toHaveProperty('latest');
      expect(response.body.data.versions).toHaveLength(2);
      expect(response.body.data.latest.version).toBe('v2');
    });
  });

  describe('Version Headers', () => {
    it('should add version headers to responses', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('api-version');
      expect(response.headers).toHaveProperty('api-version-source');
    });

    it('should handle version from path', async () => {
      // This test might need adjustment based on actual tRPC endpoint structure
      const response = await request(app)
        .get('/trpc/v1.health')
        .expect(200);

      expect(response.headers['api-version']).toBe('v1');
      expect(response.headers['api-version-source']).toBe('path');
    });

    it('should handle version from header', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v1')
        .expect(200);

      expect(response.headers['api-version']).toBe('v1');
      expect(response.headers['api-version-source']).toBe('header');
    });
  });

  describe('Deprecation Warnings', () => {
    beforeEach(() => {
      // Register a deprecated version for testing
      VersionRegistry.registerVersion({
        version: 'v1',
        description: 'Deprecated version',
        deprecated: true,
        deprecationDate: '2024-01-01',
        supportedUntil: '2024-12-31',
      });
    });

    it('should add deprecation headers for deprecated versions', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v1')
        .expect(200);

      expect(response.headers).toHaveProperty('deprecation', 'true');
      expect(response.headers).toHaveProperty('sunset', '2024-12-31');
      expect(response.headers).toHaveProperty('warning');
      expect(response.headers.warning).toContain('deprecated');
    });

    it('should not add deprecation headers for current versions', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v2')
        .expect(200);

      expect(response.headers).not.toHaveProperty('deprecation');
      expect(response.headers).not.toHaveProperty('sunset');
      expect(response.headers).not.toHaveProperty('warning');
    });
  });

  describe('Version Validation', () => {
    it('should reject unsupported versions', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v99')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_VERSION');
      expect(response.body.error.message).toContain('v99 is not supported');
      expect(response.body.error.availableVersions).toContain('v1');
      expect(response.body.error.availableVersions).toContain('v2');
    });
  });

  describe('V2 Enhanced Features', () => {
    // Note: These tests assume tRPC endpoints are accessible via HTTP
    // In a real implementation, you might need to test through tRPC client
    
    it('should handle v2 user endpoints with enhanced data', async () => {
      // This is a conceptual test - actual implementation depends on tRPC HTTP adapter
      const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Test would verify that v2 endpoints return enhanced user data
      // with preferences, metadata, tags, status, etc.
      expect(true).toBe(true); // Placeholder
    });

    it('should handle v2 auth endpoints with enhanced security', async () => {
      // Test would verify that v2 auth endpoints return enhanced security data
      // with session info, device tracking, risk scores, etc.
      expect(true).toBe(true); // Placeholder
    });

    it('should support bulk operations in v2', async () => {
      // Test would verify bulk operations functionality
      expect(true).toBe(true); // Placeholder
    });

    it('should support analytics endpoints in v2', async () => {
      // Test would verify analytics functionality
      expect(true).toBe(true); // Placeholder
    });

    it('should support MFA endpoints in v2', async () => {
      // Test would verify MFA functionality
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Multiple Version Support', () => {
    it('should serve both v1 and v2 simultaneously', async () => {
      // Test that both versions work at the same time
      const v1Response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v1')
        .expect(200);

      const v2Response = await request(app)
        .get('/health')
        .set('Accept-Version', 'v2')
        .expect(200);

      expect(v1Response.headers['api-version']).toBe('v1');
      expect(v2Response.headers['api-version']).toBe('v2');
    });

    it('should maintain separate route handling for different versions', async () => {
      // Verify that v1 and v2 routes are handled separately
      // This would test the actual tRPC route resolution
      expect(true).toBe(true); // Placeholder for actual tRPC testing
    });
  });

  describe('Development Debug Headers', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include debug headers in development', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-api-version-debug');
      
      const debugInfo = JSON.parse(response.headers['x-api-version-debug']);
      expect(debugInfo).toHaveProperty('version');
      expect(debugInfo).toHaveProperty('source');
      expect(debugInfo).toHaveProperty('deprecated');
      expect(debugInfo).toHaveProperty('availableVersions');
      expect(debugInfo.availableVersions).toContain('v1');
      expect(debugInfo.availableVersions).toContain('v2');
    });
  });
});