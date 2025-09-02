import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getJWTConfig } from './config';
import { ValidationError, AuthenticationError } from './errors';

/**
 * Common response wrapper for API endpoints
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  meta?: {
    pagination?: PaginationMeta;
    [key: string]: any;
  };
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

/**
 * Response helper functions
 */
export class ResponseHelper {
  /**
   * Create success response
   */
  static success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      ...(meta && { meta }),
    };
  }

  /**
   * Create error response
   */
  static error(
    code: string,
    message: string,
    details?: Record<string, any>
  ): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: PaginationParams,
    total: number
  ): ApiResponse<T[]> {
    const totalPages = Math.ceil(total / pagination.limit);
    const hasNext = pagination.page < totalPages;
    const hasPrev = pagination.page > 1;

    const paginationMeta: PaginationMeta = {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return ResponseHelper.success(data, { pagination: paginationMeta });
  }
}

/**
 * Validation helper functions
 */
export class ValidationHelper {
  /**
   * Validate data against Zod schema
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw ValidationError.fromZodError(error);
      }
      throw error;
    }
  }

  /**
   * Safe validation that returns result or null
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
    try {
      return schema.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(params: unknown): PaginationParams {
    const result = paginationSchema.parse(params);
    return result;
  }

  /**
   * Validate UUID
   */
  static validateUUID(value: string): string {
    const uuidSchema = z.string().uuid();
    return ValidationHelper.validate(uuidSchema, value);
  }

  /**
   * Validate email
   */
  static validateEmail(value: string): string {
    const emailSchema = z.string().email();
    return ValidationHelper.validate(emailSchema, value);
  }
}

/**
 * Password utility functions
 */
export class PasswordHelper {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash password using bcrypt
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, PasswordHelper.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validateStrength(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }

  /**
   * Generate random password
   */
  static generateRandom(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}

/**
 * JWT utility functions
 */
export class JWTHelper {
  private static getConfig() {
    return getJWTConfig();
  }

  /**
   * Generate JWT token
   */
  static generate(payload: Record<string, any>): string {
    const config = JWTHelper.getConfig();
    return jwt.sign(payload, config.secret, { expiresIn: config.expiresIn } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  static verify(token: string): Record<string, any> {
    try {
      const config = JWTHelper.getConfig();
      return jwt.verify(token, config.secret) as Record<string, any>;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  static decode(token: string): Record<string, any> | null {
    return jwt.decode(token) as Record<string, any> | null;
  }

  /**
   * Extract token from Authorization header
   */
  static extractFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AuthenticationError('Authorization header missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError('Invalid authorization header format');
    }

    const token = parts[1];
    if (!token) {
      throw new AuthenticationError('Token missing from authorization header');
    }

    return token;
  }
}

/**
 * Date utility functions
 */
export class DateHelper {
  /**
   * Get current timestamp in ISO format
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add hours to date
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Check if date is expired
   */
  static isExpired(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Format date for database
   */
  static toDBFormat(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse date from string
   */
  static fromString(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date format');
    }
    return date;
  }
}

/**
 * String utility functions
 */
export class StringHelper {
  /**
   * Generate random string
   */
  static random(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Slugify string
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Truncate string
   */
  static truncate(text: string, maxLength: number, suffix: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Mask sensitive data
   */
  static mask(text: string, visibleChars: number = 4): string {
    if (text.length <= visibleChars) return '*'.repeat(text.length);
    return text.substring(0, visibleChars) + '*'.repeat(text.length - visibleChars);
  }
}

/**
 * Object utility functions
 */
export class ObjectHelper {
  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Remove undefined values from object
   */
  static removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key as keyof T] = value;
      }
    }
    return result;
  }

  /**
   * Pick specific keys from object
   */
  static pick<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * Omit specific keys from object
   */
  static omit<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
      delete result[key];
    }
    return result;
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: Record<string, any>): boolean {
    return Object.keys(obj).length === 0;
  }
}

/**
 * Array utility functions
 */
export class ArrayHelper {
  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Shuffle array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp!;
    }
    return shuffled;
  }

  /**
   * Group array by key
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

/**
 * Async utility functions
 */
export class AsyncHelper {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry async function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await AsyncHelper.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute promises with concurrency limit
   */
  static async concurrent<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Timeout wrapper for promises
   */
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }
}