import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  VersionRegistry, 
  extractVersionFromPath, 
  extractVersionFromHeaders, 
  determineApiVersion 
} from '../middleware/versioning';
import { Request } from 'express';

describe('Versioning Unit Tests', () => {
  beforeEach(() => {
    // Clear and reset version registry for each test
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

  describe('Deprecation Handling', () => {
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

    it('should identify deprecated versions', () => {
      expect(VersionRegistry.isVersionDeprecated('v1')).toBe(true);
      expect(VersionRegistry.isVersionDeprecated('v2')).toBe(false);
    });

    it('should provide deprecation information', () => {
      const deprecationInfo = VersionRegistry.getDeprecationInfo('v1');
      
      expect(deprecationInfo.deprecated).toBe(true);
      expect(deprecationInfo.deprecationDate).toBe('2024-01-01');
      expect(deprecationInfo.supportedUntil).toBe('2024-12-31');
      expect(deprecationInfo.message).toContain('API version v1 is deprecated');
      expect(deprecationInfo.message).toContain('Support will end on 2024-12-31');
      expect(deprecationInfo.message).toContain('Please migrate to v2');
    });

    it('should not provide deprecation info for current versions', () => {
      const deprecationInfo = VersionRegistry.getDeprecationInfo('v2');
      
      expect(deprecationInfo.deprecated).toBe(false);
      expect(deprecationInfo.deprecationDate).toBeUndefined();
      expect(deprecationInfo.supportedUntil).toBeUndefined();
      expect(deprecationInfo.message).toBeUndefined();
    });
  });

  describe('Version Validation', () => {
    it('should validate supported versions', () => {
      expect(VersionRegistry.getVersion('v1')).toBeDefined();
      expect(VersionRegistry.getVersion('v2')).toBeDefined();
      expect(VersionRegistry.getVersion('v99')).toBeUndefined();
    });

    it('should list all available versions', () => {
      const versions = VersionRegistry.getAllVersions();
      const versionStrings = versions.map(v => v.version);
      
      expect(versionStrings).toContain('v1');
      expect(versionStrings).toContain('v2');
      expect(versionStrings).not.toContain('v99');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty version registry', () => {
      VersionRegistry['versions'].clear();
      
      expect(VersionRegistry.getAllVersions()).toHaveLength(0);
      expect(VersionRegistry.getLatestVersion()).toBeUndefined();
      expect(VersionRegistry.getVersion('v1')).toBeUndefined();
    });

    it('should handle malformed version paths', () => {
      expect(extractVersionFromPath('/v/users')).toBeNull();
      expect(extractVersionFromPath('/version1/users')).toBeNull();
      expect(extractVersionFromPath('/v1a/users')).toBeNull();
      expect(extractVersionFromPath('')).toBeNull();
    });

    it('should handle malformed version headers', () => {
      const req1 = {
        headers: { 'accept-version': 'version1' }
      } as Request;
      expect(extractVersionFromHeaders(req1)).toBeNull();

      const req2 = {
        headers: { 'accept-version': 'v' }
      } as Request;
      expect(extractVersionFromHeaders(req2)).toBeNull();

      const req3 = {
        headers: { 'accept-version': '' }
      } as Request;
      expect(extractVersionFromHeaders(req3)).toBeNull();
    });

    it('should handle default version when registry is empty', () => {
      VersionRegistry['versions'].clear();
      
      const req = {
        path: '/users',
        headers: {}
      } as Request;
      const result = determineApiVersion(req);
      
      expect(result.version).toBe('v1'); // Fallback default
      expect(result.source).toBe('default');
    });
  });
});