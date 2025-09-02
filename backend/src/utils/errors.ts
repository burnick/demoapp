import { z } from "zod";

/**
 * Base API Error class that all custom errors extend from
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, any> | undefined;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON format for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Validation Error - for input validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }

  /**
   * Create ValidationError from Zod error
   */
  static fromZodError(error: z.ZodError): ValidationError {
    const details = error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    return new ValidationError("Input validation failed", {
      validationErrors: details,
    });
  }
}

/**
 * Authentication Error - for authentication failures
 */
export class AuthenticationError extends ApiError {
  constructor(
    message: string = "Authentication required",
    details?: Record<string, any>
  ) {
    super(message, 401, "AUTHENTICATION_ERROR", details);
  }
}

/**
 * Authorization Error - for authorization failures
 */
export class AuthorizationError extends ApiError {
  constructor(
    message: string = "Insufficient permissions",
    details?: Record<string, any>
  ) {
    super(message, 403, "AUTHORIZATION_ERROR", details);
  }
}

/**
 * Not Found Error - for resource not found
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource", details?: Record<string, any>) {
    super(`${resource} not found`, 404, "NOT_FOUND_ERROR", details);
  }
}

/**
 * Conflict Error - for resource conflicts
 */
export class ConflictError extends ApiError {
  constructor(
    message: string = "Resource conflict",
    details?: Record<string, any>
  ) {
    super(message, 409, "CONFLICT_ERROR", details);
  }
}

/**
 * Rate Limit Error - for rate limiting
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string = "Rate limit exceeded",
    details?: Record<string, any>
  ) {
    super(message, 429, "RATE_LIMIT_ERROR", details);
  }
}

/**
 * Database Error - for database operation failures
 */
export class DatabaseError extends ApiError {
  constructor(
    message: string = "Database operation failed",
    details?: Record<string, any>
  ) {
    super(message, 500, "DATABASE_ERROR", details);
  }
}

/**
 * External Service Error - for external service failures
 */
export class ExternalServiceError extends ApiError {
  constructor(
    service: string,
    message: string = "External service error",
    details?: Record<string, any>
  ) {
    super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR", {
      service,
      ...details,
    });
  }
}

/**
 * Configuration Error - for configuration issues
 */
export class ConfigurationError extends ApiError {
  constructor(
    message: string = "Configuration error",
    details?: Record<string, any>
  ) {
    super(message, 500, "CONFIGURATION_ERROR", details);
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Check if error is an instance of ApiError
   */
  static isApiError(error: any): error is ApiError {
    return error instanceof ApiError;
  }

  /**
   * Convert any error to ApiError
   */
  static toApiError(error: any): ApiError {
    if (ErrorHandler.isApiError(error)) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return ValidationError.fromZodError(error);
    }

    if (error instanceof Error) {
      return new ApiError(error.message, 500, "INTERNAL_ERROR", {
        originalError: error.name,
        stack: error.stack,
      });
    }

    return new ApiError("An unknown error occurred", 500, "UNKNOWN_ERROR", {
      originalError: String(error),
    });
  }

  /**
   * Format error for logging
   */
  static formatForLogging(error: any): Record<string, any> {
    const apiError = ErrorHandler.toApiError(error);

    return {
      code: apiError.code,
      message: apiError.message,
      statusCode: apiError.statusCode,
      timestamp: apiError.timestamp,
      stack: apiError.stack,
      ...(apiError.details && { details: apiError.details }),
    };
  }

  /**
   * Format error for API response
   */
  static formatForResponse(error: any): Record<string, any> {
    const apiError = ErrorHandler.toApiError(error);
    return apiError.toJSON();
  }

  /**
   * Check if error should be logged as error level
   */
  static shouldLogAsError(error: any): boolean {
    const apiError = ErrorHandler.toApiError(error);
    // Log 5xx errors as error level, others as warn
    return apiError.statusCode >= 500;
  }

  /**
   * Get appropriate log level for error
   */
  static getLogLevel(error: any): "error" | "warn" | "info" {
    const apiError = ErrorHandler.toApiError(error);

    if (apiError.statusCode >= 500) {
      return "error";
    } else if (apiError.statusCode >= 400) {
      return "warn";
    } else {
      return "info";
    }
  }
}

/**
 * Async error wrapper utility
 */
export const asyncHandler = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return (...args: T): Promise<R> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      throw ErrorHandler.toApiError(error);
    });
  };
};

/**
 * Error boundary for synchronous functions
 */
export const errorBoundary = <T extends any[], R>(fn: (...args: T) => R) => {
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      throw ErrorHandler.toApiError(error);
    }
  };
};
