import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

/**
 * Version configuration interface
 */
export interface VersionConfig {
  version: string;
  deprecated?: boolean;
  deprecationDate?: string;
  supportedUntil?: string;
  description?: string;
}

/**
 * Version registry to track all API versions
 */
export class VersionRegistry {
  private static versions: Map<string, VersionConfig> = new Map();

  /**
   * Register a new API version
   */
  static registerVersion(config: VersionConfig): void {
    this.versions.set(config.version, config);
    Logger.info('API version registered', {
      version: config.version,
      deprecated: config.deprecated,
      deprecationDate: config.deprecationDate,
      supportedUntil: config.supportedUntil,
    });
  }

  /**
   * Get version configuration
   */
  static getVersion(version: string): VersionConfig | undefined {
    return this.versions.get(version);
  }

  /**
   * Get all registered versions
   */
  static getAllVersions(): VersionConfig[] {
    return Array.from(this.versions.values()).sort((a, b) => {
      // Sort by version number (assuming format like v1, v2, etc.)
      const aNum = parseInt(a.version.replace('v', ''));
      const bNum = parseInt(b.version.replace('v', ''));
      return aNum - bNum;
    });
  }

  /**
   * Get latest version
   */
  static getLatestVersion(): VersionConfig | undefined {
    const versions = this.getAllVersions();
    return versions[versions.length - 1];
  }

  /**
   * Check if version is deprecated
   */
  static isVersionDeprecated(version: string): boolean {
    const versionConfig = this.getVersion(version);
    return versionConfig?.deprecated === true;
  }

  /**
   * Get deprecation info for version
   */
  static getDeprecationInfo(version: string): {
    deprecated: boolean;
    deprecationDate?: string;
    supportedUntil?: string;
    message?: string;
  } {
    const versionConfig = this.getVersion(version);
    
    if (!versionConfig) {
      return { deprecated: false };
    }

    const deprecated = versionConfig.deprecated === true;
    let message: string | undefined;

    if (deprecated) {
      message = `API version ${version} is deprecated.`;
      
      if (versionConfig.supportedUntil) {
        message += ` Support will end on ${versionConfig.supportedUntil}.`;
      }
      
      const latestVersion = this.getLatestVersion();
      if (latestVersion && latestVersion.version !== version) {
        message += ` Please migrate to ${latestVersion.version}.`;
      }
    }

    return {
      deprecated,
      deprecationDate: versionConfig.deprecationDate,
      supportedUntil: versionConfig.supportedUntil,
      message,
    };
  }
}

/**
 * Extract version from request path
 */
export function extractVersionFromPath(path: string): string | null {
  const versionMatch = path.match(/^\/?(v\d+)\//);
  return versionMatch ? versionMatch[1] : null;
}

/**
 * Extract version from request headers
 */
export function extractVersionFromHeaders(req: Request): string | null {
  // Check Accept-Version header
  const acceptVersion = req.headers['accept-version'] as string;
  if (acceptVersion && acceptVersion.match(/^v\d+$/)) {
    return acceptVersion;
  }

  // Check API-Version header
  const apiVersion = req.headers['api-version'] as string;
  if (apiVersion && apiVersion.match(/^v\d+$/)) {
    return apiVersion;
  }

  return null;
}

/**
 * Determine the API version to use for the request
 */
export function determineApiVersion(req: Request): {
  version: string;
  source: 'path' | 'header' | 'default';
} {
  // First, try to extract from path
  const pathVersion = extractVersionFromPath(req.path);
  if (pathVersion) {
    return { version: pathVersion, source: 'path' };
  }

  // Then, try to extract from headers
  const headerVersion = extractVersionFromHeaders(req);
  if (headerVersion) {
    return { version: headerVersion, source: 'header' };
  }

  // Default to latest version
  const latestVersion = VersionRegistry.getLatestVersion();
  const defaultVersion = latestVersion?.version || 'v1';
  
  return { version: defaultVersion, source: 'default' };
}

/**
 * Version routing middleware
 * Adds version information to request and response headers
 */
export function versioningMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const { version, source } = determineApiVersion(req);
    
    // Add version info to request
    (req as any).apiVersion = version;
    (req as any).versionSource = source;
    
    // Add version headers to response
    res.setHeader('API-Version', version);
    res.setHeader('API-Version-Source', source);
    
    // Check for deprecation
    const deprecationInfo = VersionRegistry.getDeprecationInfo(version);
    
    if (deprecationInfo.deprecated) {
      // Add deprecation headers
      res.setHeader('Deprecation', 'true');
      
      if (deprecationInfo.deprecationDate) {
        res.setHeader('Sunset', deprecationInfo.deprecationDate);
      }
      
      if (deprecationInfo.message) {
        res.setHeader('Warning', `299 - "${deprecationInfo.message}"`);
      }
      
      // Log deprecation usage
      Logger.warn('Deprecated API version used', {
        version,
        source,
        path: req.path,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        deprecationInfo,
      });
    }
    
    // Add version info to response for debugging
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-API-Version-Debug', JSON.stringify({
        version,
        source,
        deprecated: deprecationInfo.deprecated,
        availableVersions: VersionRegistry.getAllVersions().map(v => v.version),
      }));
    }
    
    Logger.debug('API version determined', {
      version,
      source,
      path: req.path,
      deprecated: deprecationInfo.deprecated,
    });
    
    next();
  };
}

/**
 * Version validation middleware
 * Ensures the requested version is supported
 */
export function versionValidationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const version = (req as any).apiVersion;
    
    if (!version) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_REQUIRED',
          message: 'API version is required',
        },
      });
    }
    
    const versionConfig = VersionRegistry.getVersion(version);
    
    if (!versionConfig) {
      const availableVersions = VersionRegistry.getAllVersions().map(v => v.version);
      
      return res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_VERSION',
          message: `API version ${version} is not supported`,
          availableVersions,
        },
      });
    }
    
    next();
  };
}

/**
 * Initialize version registry with default versions
 */
export function initializeVersionRegistry(): void {
  // Register v1 (current stable version)
  VersionRegistry.registerVersion({
    version: 'v1',
    description: 'Initial stable API version',
    deprecated: false,
  });
  
  // Register v2 (new version with enhanced features)
  VersionRegistry.registerVersion({
    version: 'v2',
    description: 'Enhanced API version with improved features',
    deprecated: false,
  });
  
  Logger.info('Version registry initialized', {
    versions: VersionRegistry.getAllVersions().map(v => ({
      version: v.version,
      deprecated: v.deprecated,
      description: v.description,
    })),
  });
}

/**
 * Get version information endpoint handler
 */
export function getVersionInfo() {
  return {
    versions: VersionRegistry.getAllVersions(),
    latest: VersionRegistry.getLatestVersion(),
    deprecated: VersionRegistry.getAllVersions().filter(v => v.deprecated),
  };
}