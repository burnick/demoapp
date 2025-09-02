import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { router } from '../trpc/router';
import { Logger } from './logger';

/**
 * Interface for route modules
 */
export interface RouteModule {
  router: any;
  meta?: {
    version: string;
    description?: string;
    deprecated?: boolean;
    deprecationDate?: string;
  };
}

/**
 * Interface for versioned router configuration
 */
export interface VersionedRouter {
  version: string;
  router: any;
  prefix: string;
  meta?: {
    deprecated?: boolean;
    deprecationDate?: string;
    supportedUntil?: string;
  } | undefined;
}

/**
 * Route discovery utility class
 */
export class RouteLoader {
  private routesPath: string;
  private loadedRoutes: Map<string, RouteModule> = new Map();
  private versionedRouters: Map<string, VersionedRouter> = new Map();

  constructor(routesPath: string) {
    this.routesPath = routesPath;
  }

  /**
   * Scan routes directory and discover all route files
   */
  private scanRoutesDirectory(dirPath: string, version?: string): string[] {
    const routeFiles: string[] = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // If this is a version directory (v1, v2, etc.)
          if (item.match(/^v\d+$/)) {
            const versionRoutes = this.scanRoutesDirectory(fullPath, item);
            routeFiles.push(...versionRoutes);
          } else {
            // Regular subdirectory
            const subRoutes = this.scanRoutesDirectory(fullPath, version);
            routeFiles.push(...subRoutes);
          }
        } else if (stat.isFile()) {
          // Only include TypeScript files, exclude index files
          if (extname(item) === '.ts' && basename(item, '.ts') !== 'index') {
            routeFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      Logger.warn('Failed to scan routes directory', {
        dirPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    return routeFiles;
  }

  /**
   * Load a single route module
   */
  private async loadRouteModule(filePath: string): Promise<RouteModule | null> {
    try {
      // Clear require cache in development
      if (process.env.NODE_ENV === 'development') {
        delete require.cache[require.resolve(filePath)];
      }
      
      const module = await import(filePath);
      
      // Check if module exports a router
      if (!module.router && !module.default?.router) {
        Logger.warn('Route module does not export a router', { filePath });
        return null;
      }
      
      const routeModule: RouteModule = {
        router: module.router || module.default.router,
        meta: module.meta || module.default?.meta,
      };
      
      Logger.debug('Loaded route module', {
        filePath,
        version: routeModule.meta?.version,
        description: routeModule.meta?.description,
      });
      
      return routeModule;
    } catch (error) {
      Logger.error('Failed to load route module', {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  }

  /**
   * Extract version from file path
   */
  private extractVersionFromPath(filePath: string): string {
    const pathParts = filePath.split('/');
    const versionMatch = pathParts.find(part => part.match(/^v\d+$/));
    return versionMatch || 'v1'; // Default to v1 if no version found
  }

  /**
   * Generate route key from file path
   */
  private generateRouteKey(filePath: string): string {
    const relativePath = filePath.replace(this.routesPath, '');
    return relativePath.replace(/\.(ts|js)$/, '').replace(/^\//, '');
  }

  /**
   * Load all routes from the routes directory
   */
  async loadRoutes(): Promise<void> {
    Logger.info('Starting route discovery', { routesPath: this.routesPath });
    
    const routeFiles = this.scanRoutesDirectory(this.routesPath);
    
    Logger.info('Discovered route files', {
      count: routeFiles.length,
      files: routeFiles.map(f => f.replace(this.routesPath, '')),
    });
    
    // Load all route modules
    for (const filePath of routeFiles) {
      const routeModule = await this.loadRouteModule(filePath);
      
      if (routeModule) {
        const routeKey = this.generateRouteKey(filePath);
        this.loadedRoutes.set(routeKey, routeModule);
        
        // Extract version and organize by version
        const version = this.extractVersionFromPath(filePath);
        this.organizeRouteByVersion(version, routeKey, routeModule);
      }
    }
    
    Logger.info('Route loading completed', {
      totalRoutes: this.loadedRoutes.size,
      versions: Array.from(this.versionedRouters.keys()),
    });
  }

  /**
   * Organize routes by version
   */
  private organizeRouteByVersion(version: string, routeKey: string, routeModule: RouteModule): void {
    if (!this.versionedRouters.has(version)) {
      this.versionedRouters.set(version, {
        version,
        router: router({}),
        prefix: `/${version}`,
        meta: routeModule.meta ? {
          ...(routeModule.meta.deprecated !== undefined && { deprecated: routeModule.meta.deprecated }),
          ...(routeModule.meta.deprecationDate && { deprecationDate: routeModule.meta.deprecationDate }),
        } : undefined,
      });
    }
    
    const versionedRouter = this.versionedRouters.get(version)!;
    
    // Extract route name from key (remove version prefix)
    const routeName = routeKey.replace(`${version}/`, '').replace(/\//g, '_');
    
    // Add route to versioned router
    versionedRouter.router = router({
      ...versionedRouter.router._def.record,
      [routeName]: routeModule.router,
    });
    
    Logger.debug('Added route to version', {
      version,
      routeName,
      routeKey,
    });
  }

  /**
   * Get all loaded routes
   */
  getLoadedRoutes(): Map<string, RouteModule> {
    return this.loadedRoutes;
  }

  /**
   * Get versioned routers
   */
  getVersionedRouters(): Map<string, VersionedRouter> {
    return this.versionedRouters;
  }

  /**
   * Get router for specific version
   */
  getVersionRouter(version: string): VersionedRouter | undefined {
    return this.versionedRouters.get(version);
  }

  /**
   * Get all available versions
   */
  getAvailableVersions(): string[] {
    return Array.from(this.versionedRouters.keys()).sort();
  }

  /**
   * Create combined router with all versions
   */
  createCombinedRouter(): any {
    const combinedRoutes: Record<string, any> = {};
    
    // Add each versioned router to the combined router
    for (const [version, versionedRouter] of this.versionedRouters) {
      combinedRoutes[version] = versionedRouter.router;
    }
    
    Logger.info('Created combined router', {
      versions: Object.keys(combinedRoutes),
    });
    
    return router(combinedRoutes);
  }

  /**
   * Reload routes (useful for development)
   */
  async reloadRoutes(): Promise<void> {
    Logger.info('Reloading routes');
    
    // Clear existing routes
    this.loadedRoutes.clear();
    this.versionedRouters.clear();
    
    // Reload all routes
    await this.loadRoutes();
  }
}

/**
 * Create and configure route loader instance
 */
export function createRouteLoader(routesPath: string): RouteLoader {
  return new RouteLoader(routesPath);
}