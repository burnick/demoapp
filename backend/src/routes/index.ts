import { join } from 'path';
import { createRouteLoader } from '../utils/routeLoader';
import { Logger } from '../utils/logger';

/**
 * Initialize and configure the route loader
 */
const routesPath = join(__dirname);
export const routeLoader = createRouteLoader(routesPath);

/**
 * Load all routes and create the combined router
 */
export async function initializeRoutes() {
  try {
    Logger.info('Initializing file-based routing system');
    
    // Load all routes from the routes directory
    await routeLoader.loadRoutes();
    
    // Create the combined router with all versions
    const combinedRouter = routeLoader.createCombinedRouter();
    
    // Log available versions and routes
    const versions = routeLoader.getAvailableVersions();
    const loadedRoutes = routeLoader.getLoadedRoutes();
    
    Logger.info('File-based routing system initialized', {
      availableVersions: versions,
      totalRoutes: loadedRoutes.size,
      routeKeys: Array.from(loadedRoutes.keys()),
    });
    
    return combinedRouter;
  } catch (error) {
    Logger.error('Failed to initialize routes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get route loader instance for external use
 */
export function getRouteLoader() {
  return routeLoader;
}

/**
 * Reload routes (useful for development)
 */
export async function reloadRoutes() {
  Logger.info('Reloading all routes');
  await routeLoader.reloadRoutes();
  return routeLoader.createCombinedRouter();
}

/**
 * Get information about loaded routes
 */
export function getRouteInfo() {
  const versions = routeLoader.getAvailableVersions();
  const versionedRouters = routeLoader.getVersionedRouters();
  const loadedRoutes = routeLoader.getLoadedRoutes();
  
  const routeInfo = {
    versions,
    totalRoutes: loadedRoutes.size,
    routesByVersion: {} as Record<string, any>,
  };
  
  // Organize route info by version
  for (const [version, versionedRouter] of versionedRouters) {
    routeInfo.routesByVersion[version] = {
      prefix: versionedRouter.prefix,
      meta: versionedRouter.meta,
      routes: Array.from(loadedRoutes.entries())
        .filter(([key]) => key.startsWith(version))
        .map(([key, module]) => ({
          key,
          description: module.meta?.description,
          deprecated: module.meta?.deprecated,
        })),
    };
  }
  
  return routeInfo;
}