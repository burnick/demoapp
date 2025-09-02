import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the configuration schema using Zod
const configSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  HOST: z.string().default('localhost'),
  
  // Database configuration
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // Redis configuration (optional)
  REDIS_URL: z.string().url('Invalid Redis URL').optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  
  // Elasticsearch configuration (optional)
  ELASTICSEARCH_URL: z.string().url('Invalid Elasticsearch URL').optional(),
  ELASTICSEARCH_USERNAME: z.string().optional(),
  ELASTICSEARCH_PASSWORD: z.string().optional(),
  
  // JWT configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters').optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // API configuration
  API_PREFIX: z.string().default('/api'),
  API_VERSION: z.string().default('v1'),
  
  // CORS configuration
  CORS_ORIGIN: z.string().or(z.array(z.string())).default('*'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_FILE_ENABLED: z.string().transform(val => val === 'true').default('true'),
  
  // Health check configuration
  HEALTH_CHECK_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('5000'),
  ELASTICSEARCH_HEALTH_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('15000'),
});

// Parse and validate environment variables
const parseConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }
    throw error;
  }
};

// Export the validated configuration
export const config = parseConfig();

// Export types for TypeScript
export type Config = z.infer<typeof configSchema>;

// Helper functions for configuration
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isTest = () => config.NODE_ENV === 'test';

// Database configuration helpers
export const getDatabaseConfig = () => ({
  url: config.DATABASE_URL,
});

// Redis configuration helpers
export const getRedisConfig = () => ({
  url: config.REDIS_URL,
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
});

// Elasticsearch configuration helpers
export const getElasticsearchConfig = () => ({
  url: config.ELASTICSEARCH_URL,
  username: config.ELASTICSEARCH_USERNAME,
  password: config.ELASTICSEARCH_PASSWORD,
});

// JWT configuration helpers
export const getJWTConfig = () => ({
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  expiresIn: config.JWT_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
});

// Server configuration helpers
export const getServerConfig = () => ({
  port: config.PORT,
  host: config.HOST,
  apiPrefix: config.API_PREFIX,
  apiVersion: config.API_VERSION,
});

// CORS configuration helpers
export const getCORSConfig = () => ({
  origin: config.CORS_ORIGIN,
});

// Rate limiting configuration helpers
export const getRateLimitConfig = () => ({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
});

// Logging configuration helpers
export const getLoggingConfig = () => ({
  level: config.LOG_LEVEL,
  fileEnabled: config.LOG_FILE_ENABLED,
});

// Health check configuration helpers
export const getHealthCheckConfig = () => ({
  timeout: config.HEALTH_CHECK_TIMEOUT,
  elasticsearchTimeout: config.ELASTICSEARCH_HEALTH_TIMEOUT,
});