import { z } from 'zod';
import { Logger } from '../utils/logger';
import { ValidationError, ErrorHandler } from '../utils/errors';

/**
 * Base controller class with common functionality
 * Provides shared methods for input validation, response formatting, and error handling
 */
export abstract class BaseController {
  protected readonly logger = Logger;

  /**
   * Validate input data against a Zod schema
   * @param input - The input data to validate
   * @param schema - The Zod schema to validate against
   * @returns The validated and typed data
   * @throws ValidationError if validation fails
   */
  protected validateInput<T>(input: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error);
      }
      throw new ValidationError('Input validation failed');
    }
  }

  /**
   * Format successful response
   * @param data - The response data
   * @param message - Optional success message
   * @returns Formatted success response
   */
  protected formatSuccessResponse<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      ...(message && { message }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Format error response
   * @param error - The error to format
   * @returns Formatted error response
   */
  protected formatErrorResponse(error: any) {
    return ErrorHandler.formatForResponse(error);
  }

  /**
   * Handle async operations with error catching
   * @param operation - The async operation to execute
   * @param context - Optional context for logging
   * @returns The result of the operation
   */
  protected async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      if (context) {
        this.logger.debug(`Starting operation: ${context}`);
      }
      
      const result = await operation();
      
      if (context) {
        this.logger.debug(`Completed operation: ${context}`);
      }
      
      return result;
    } catch (error) {
      if (context) {
        this.logger.error(`Operation failed: ${context}`, {
          error: ErrorHandler.formatForLogging(error),
        });
      }
      
      throw ErrorHandler.toApiError(error);
    }
  }

  /**
   * Log controller action
   * @param action - The action being performed
   * @param userId - Optional user ID for context
   * @param metadata - Additional metadata to log
   */
  protected logAction(
    action: string,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    this.logger.info(`Controller action: ${action}`, {
      userId,
      controller: this.constructor.name,
      ...metadata,
    });
  }

  /**
   * Validate pagination parameters
   * @param page - Page number
   * @param limit - Items per page
   * @returns Validated pagination parameters
   */
  protected validatePagination(page?: number, limit?: number) {
    const validatedPage = Math.max(1, page || 1);
    const validatedLimit = Math.min(Math.max(1, limit || 10), 100);
    
    return {
      page: validatedPage,
      limit: validatedLimit,
      offset: (validatedPage - 1) * validatedLimit,
    };
  }

  /**
   * Format paginated response
   * @param items - The items for the current page
   * @param total - Total number of items
   * @param page - Current page number
   * @param limit - Items per page
   * @returns Formatted paginated response
   */
  protected formatPaginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
  ) {
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Sanitize sensitive data from objects (e.g., remove passwords)
   * @param data - The data to sanitize
   * @param sensitiveFields - Array of field names to remove
   * @returns Sanitized data
   */
  protected sanitizeData<T extends Record<string, any>>(
    data: T,
    sensitiveFields: string[] = ['password', 'passwordHash', 'token', 'refreshToken']
  ): Partial<T> {
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      delete sanitized[field];
    });
    
    return sanitized;
  }

  /**
   * Check if user has permission to access resource
   * @param userId - The user ID making the request
   * @param resourceUserId - The user ID that owns the resource
   * @param allowSelf - Whether users can access their own resources
   * @returns True if access is allowed
   */
  protected checkResourceAccess(
    userId: string,
    resourceUserId: string,
    allowSelf: boolean = true
  ): boolean {
    if (allowSelf && userId === resourceUserId) {
      return true;
    }
    
    // Additional permission checks can be added here
    // For now, only allow self-access
    return false;
  }

  /**
   * Extract and validate ID parameter
   * @param id - The ID to validate
   * @param resourceName - Name of the resource for error messages
   * @returns Validated ID
   */
  protected validateId(id: string, resourceName: string = 'Resource'): string {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new ValidationError(`${resourceName} ID is required`);
    }
    
    // Additional ID format validation can be added here
    // For example, UUID validation if using UUIDs
    
    return id.trim();
  }
}