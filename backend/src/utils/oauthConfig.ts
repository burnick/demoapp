import { z } from 'zod';
import { logger } from './logger';
import { ConfigurationError } from './errors';
import { 
  OAuthProviderConfig, 
  SupportedProvider, 
  OAUTH_PROVIDERS 
} from '../types/oauth';

// OAuth configuration schema
const oauthConfigSchema = z.object({
  // Base URLs
  BASE_URL: z.string().url('Invalid base URL').optional(),
  FRONTEND_URL: z.string().url('Invalid frontend URL').optional(),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Facebook OAuth
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
});

export interface ParsedOAuthConfig {
  google?: {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
  };
  facebook?: {
    clientId: string;
    clientSecret: string;
    enabled: boolean;
  };
}

/**
 * Parse and validate OAuth configuration from environment variables
 */
export const parseOAuthConfig = (): ParsedOAuthConfig => {
  try {
    const env = oauthConfigSchema.parse(process.env);
    
    const config: ParsedOAuthConfig = {};
    
    // Configure Google OAuth if credentials are provided
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
      config.google = {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        enabled: true
      };
      logger.info('Google OAuth provider configured');
    } else {
      logger.warn('Google OAuth provider not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    }
    
    // Configure Facebook OAuth if credentials are provided
    if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
      config.facebook = {
        clientId: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
        enabled: true
      };
      logger.info('Facebook OAuth provider configured');
    } else {
      logger.warn('Facebook OAuth provider not configured - missing FACEBOOK_CLIENT_ID or FACEBOOK_CLIENT_SECRET');
    }
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new ConfigurationError(`OAuth configuration validation failed:\n${errorMessages}`);
    }
    throw error;
  }
};

/**
 * Get base URL for OAuth redirects
 */
export const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL;
  if (baseUrl) {
    return baseUrl;
  }
  
  // Fallback to constructed URL
  const port = process.env.PORT || '3000';
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}`;
};

/**
 * Get frontend URL for redirects after OAuth completion
 */
export const getFrontendUrl = (): string => {
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    return frontendUrl;
  }
  
  // Fallback to localhost frontend
  return 'http://localhost:3001';
};

/**
 * Build complete OAuth provider configuration
 */
export const buildOAuthProviders = (config: ParsedOAuthConfig): Map<SupportedProvider, OAuthProviderConfig> => {
  const providers = new Map<SupportedProvider, OAuthProviderConfig>();
  const baseUrl = getBaseUrl();
  
  // Configure Google provider
  if (config.google?.enabled) {
    const googleConfig = OAUTH_PROVIDERS.google;
    providers.set('google', {
      ...googleConfig,
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: `${baseUrl}${googleConfig.redirectUri}`,
      enabled: true
    });
  }
  
  // Configure Facebook provider
  if (config.facebook?.enabled) {
    const facebookConfig = OAUTH_PROVIDERS.facebook;
    providers.set('facebook', {
      ...facebookConfig,
      clientId: config.facebook.clientId,
      clientSecret: config.facebook.clientSecret,
      redirectUri: `${baseUrl}${facebookConfig.redirectUri}`,
      enabled: true
    });
  }
  
  logger.info(`Configured ${providers.size} OAuth providers`, {
    providers: Array.from(providers.keys())
  });
  
  return providers;
};

/**
 * Validate OAuth provider configuration
 */
export const validateOAuthConfig = (config: ParsedOAuthConfig): void => {
  const enabledProviders = Object.entries(config).filter(([_, providerConfig]) => providerConfig?.enabled);
  
  if (enabledProviders.length === 0) {
    logger.warn('No OAuth providers are configured and enabled');
    return;
  }
  
  // Validate each enabled provider
  for (const [providerName, providerConfig] of enabledProviders) {
    if (!providerConfig?.clientId) {
      throw new ConfigurationError(`OAuth provider ${providerName} is missing client ID`);
    }
    
    if (!providerConfig?.clientSecret) {
      throw new ConfigurationError(`OAuth provider ${providerName} is missing client secret`);
    }
    
    logger.debug(`OAuth provider ${providerName} configuration validated`);
  }
  
  logger.info(`OAuth configuration validated for ${enabledProviders.length} providers`);
};