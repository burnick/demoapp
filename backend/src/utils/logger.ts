import * as winston from 'winston';
import { config, isDevelopment, isProduction, getLoggingConfig } from './config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Get logging configuration
const loggingConfig = getLoggingConfig();

// Define format for development (human-readable)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    // Add error stack if present
    if (info.error && info.error instanceof Error) {
      logMessage += `\n${info.error.stack}`;
    }
    
    // Add metadata if present
    const metaKeys = Object.keys(meta).filter(key => 
      !['timestamp', 'level', 'message', 'splat', 'error'].includes(key)
    );
    
    if (metaKeys.length > 0) {
      const metaData = Object.fromEntries(
        metaKeys.map(key => [key, meta[key]])
      );
      logMessage += `\n${JSON.stringify(metaData, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Define format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Choose format based on environment
const logFormat = isDevelopment() ? developmentFormat : productionFormat;

// Create transports array
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: isDevelopment() ? developmentFormat : winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
];

// Add file transports if enabled
if (loggingConfig.fileEnabled) {
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: loggingConfig.level,
  levels,
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Handle uncaught exceptions and unhandled rejections in production
if (isProduction()) {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  
  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}

/**
 * Enhanced logger with additional utility methods
 */
export class Logger {
  private static instance: winston.Logger = logger;

  /**
   * Log error with structured format
   */
  static error(message: string, meta?: Record<string, any>): void {
    this.instance.error(message, meta);
  }

  /**
   * Log warning with structured format
   */
  static warn(message: string, meta?: Record<string, any>): void {
    this.instance.warn(message, meta);
  }

  /**
   * Log info with structured format
   */
  static info(message: string, meta?: Record<string, any>): void {
    this.instance.info(message, meta);
  }

  /**
   * Log HTTP requests
   */
  static http(message: string, meta?: Record<string, any>): void {
    this.instance.http(message, meta);
  }

  /**
   * Log debug information
   */
  static debug(message: string, meta?: Record<string, any>): void {
    this.instance.debug(message, meta);
  }

  /**
   * Log database operations
   */
  static database(operation: string, meta?: Record<string, any>): void {
    this.instance.info(`[DATABASE] ${operation}`, meta);
  }

  /**
   * Log API requests
   */
  static api(method: string, path: string, statusCode: number, responseTime: number, meta?: Record<string, any>): void {
    this.instance.http(`[API] ${method} ${path} ${statusCode} - ${responseTime}ms`, meta);
  }

  /**
   * Log authentication events
   */
  static auth(event: string, meta?: Record<string, any>): void {
    this.instance.info(`[AUTH] ${event}`, meta);
  }

  /**
   * Log cache operations
   */
  static cache(operation: string, key: string, meta?: Record<string, any>): void {
    this.instance.debug(`[CACHE] ${operation} - ${key}`, meta);
  }

  /**
   * Log external service calls
   */
  static external(service: string, operation: string, meta?: Record<string, any>): void {
    this.instance.info(`[EXTERNAL] ${service} - ${operation}`, meta);
  }

  /**
   * Create child logger with additional context
   */
  static child(defaultMeta: Record<string, any>): winston.Logger {
    return this.instance.child(defaultMeta);
  }

  /**
   * Get the underlying winston logger instance
   */
  static getInstance(): winston.Logger {
    return this.instance;
  }
}

// Export both the winston logger instance and the enhanced Logger class
export { logger };
export default Logger;