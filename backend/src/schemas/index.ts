// Export all schemas and types
export * from './common';
export * from './user';
export * from './auth';

import { z } from 'zod';
import { ApiResponseSchema, PaginatedResponseSchema, ErrorResponseSchema } from './common';

// Schema composition utilities
export class SchemaUtils {
  /**
   * Creates a paginated response schema for any item type
   */
  static createPaginatedResponse<T extends z.ZodTypeAny>(itemSchema: T) {
    return PaginatedResponseSchema(itemSchema);
  }

  /**
   * Creates an API response wrapper for any data type
   */
  static createApiResponse<T extends z.ZodTypeAny>(dataSchema: T) {
    return ApiResponseSchema(dataSchema);
  }

  /**
   * Creates a partial schema from an existing schema (all fields optional)
   */
  static createPartialSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
    return schema.partial();
  }

  /**
   * Merges multiple schemas into one
   */
  static mergeSchemas<T extends z.ZodRawShape, U extends z.ZodRawShape>(
    schema1: z.ZodObject<T>,
    schema2: z.ZodObject<U>
  ) {
    return schema1.merge(schema2);
  }

  /**
   * Creates a union schema from multiple schemas
   */
  static createUnionSchema<T extends readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]>(
    schemas: T
  ) {
    return z.union(schemas);
  }

  /**
   * Creates an array schema with validation
   */
  static createArraySchema<T extends z.ZodTypeAny>(
    itemSchema: T,
    options?: {
      min?: number;
      max?: number;
      message?: string;
    }
  ) {
    let arraySchema = z.array(itemSchema);
    
    if (options?.min !== undefined) {
      arraySchema = arraySchema.min(options.min, options.message);
    }
    
    if (options?.max !== undefined) {
      arraySchema = arraySchema.max(options.max, options.message);
    }
    
    return arraySchema;
  }

  /**
   * Validates data against a schema and returns typed result
   */
  static validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
  }

  /**
   * Creates a schema that transforms data after validation
   */
  static withTransform<T, U>(
    schema: z.ZodSchema<T>,
    transform: (data: T) => U
  ) {
    return schema.transform(transform);
  }

  /**
   * Creates a schema with preprocessing
   */
  static withPreprocess<T>(
    preprocess: (data: unknown) => unknown,
    schema: z.ZodSchema<T>
  ) {
    return z.preprocess(preprocess, schema);
  }
}

// Common validation patterns
export const ValidationPatterns = {
  // Phone number validation (international format)
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'),
  
  // URL validation
  url: z.string().url('Invalid URL format'),
  
  // Slug validation (URL-friendly string)
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  
  // Color hex code validation
  hexColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color format'),
  
  // IP address validation
  ipAddress: z.string().ip('Invalid IP address'),
  
  // Base64 validation
  base64: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 format'),
  
  // JSON string validation
  jsonString: z.string().refine((str) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON string'),
  
  // Positive integer
  positiveInt: z.number().int().positive(),
  
  // Non-negative integer
  nonNegativeInt: z.number().int().nonnegative(),
  
  // Percentage (0-100)
  percentage: z.number().min(0).max(100),
  
  // File size in bytes
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
  
  // MIME type validation
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, 'Invalid MIME type'),
};

// Error message utilities
export const ErrorMessages = {
  required: (field: string) => `${field} is required`,
  invalid: (field: string) => `${field} is invalid`,
  tooShort: (field: string, min: number) => `${field} must be at least ${min} characters`,
  tooLong: (field: string, max: number) => `${field} must be less than ${max} characters`,
  notFound: (resource: string) => `${resource} not found`,
  alreadyExists: (resource: string) => `${resource} already exists`,
  unauthorized: () => 'Unauthorized access',
  forbidden: () => 'Access forbidden',
  serverError: () => 'Internal server error',
};

// Schema validation middleware helper
export const createValidationMiddleware = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown) => {
    const result = SchemaUtils.validateData(schema, data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.message}`);
    }
    return result.data;
  };
};