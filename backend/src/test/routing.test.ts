import { join } from 'path';
import { createRouteLoader } from '../utils/routeLoader';

describe('File-based Routing System', () => {
  let routeLoader: any;

  beforeAll(async () => {
    // Create route loader with the routes directory
    const routesPath = join(__dirname, '../routes');
    routeLoader = createRouteLoader(routesPath);
    
    // Load all routes
    await routeLoader.loadRoutes();
  });

  test('should discover and load route files', () => {
    const loadedRoutes = routeLoader.getLoadedRoutes();
    
    // Should have loaded routes
    expect(loadedRoutes.size).toBeGreaterThan(0);
    
    // Should have v1 routes
    const routeKeys = Array.from(loadedRoutes.keys()) as string[];
    expect(routeKeys.some(key => key.includes('v1'))).toBe(true);
  });

  test('should organize routes by version', () => {
    const versionedRouters = routeLoader.getVersionedRouters();
    
    // Should have v1 version
    expect(versionedRouters.has('v1')).toBe(true);
    
    const v1Router = versionedRouters.get('v1');
    expect(v1Router).toBeDefined();
    expect(v1Router?.version).toBe('v1');
    expect(v1Router?.prefix).toBe('/v1');
  });

  test('should get available versions', () => {
    const versions = routeLoader.getAvailableVersions();
    
    expect(versions).toContain('v1');
    expect(Array.isArray(versions)).toBe(true);
  });

  test('should create combined router', () => {
    const combinedRouter = routeLoader.createCombinedRouter();
    
    expect(combinedRouter).toBeDefined();
    expect(combinedRouter._def).toBeDefined();
    expect(combinedRouter._def.record).toBeDefined();
  });

  test('should have correct route structure', () => {
    const loadedRoutes = routeLoader.getLoadedRoutes();
    const routeKeys = Array.from(loadedRoutes.keys()) as string[];
    
    // Should have users and auth routes
    expect(routeKeys.some(key => key.includes('users'))).toBe(true);
    expect(routeKeys.some(key => key.includes('auth'))).toBe(true);
  });

  test('should have route metadata', () => {
    const loadedRoutes = routeLoader.getLoadedRoutes();
    
    for (const [key, routeModule] of loadedRoutes) {
      if (routeModule.meta) {
        expect(routeModule.meta.version).toBeDefined();
        expect(typeof routeModule.meta.deprecated).toBe('boolean');
      }
    }
  });
});