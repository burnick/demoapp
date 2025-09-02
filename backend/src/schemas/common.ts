import { z } from 'zod';

// Base response wrapper schema
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().optional(),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  });

// Error response schema
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
});

// Common field validation schemas
export const IdSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Date schemas
export const DateTimeSchema = z.string().datetime();
export const DateSchema = z.string().date();

// Query parameter schemas
export const SortOrderSchema = z.enum(['asc', 'desc']).default('asc');
export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').optional(),
  sort: z.string().optional(),
  order: SortOrderSchema,
});

// HTTP status code schema
export const HttpStatusSchema = z.number().int().min(100).max(599);

// Generic ID parameter schema
export const ParamIdSchema = z.object({
  id: IdSchema,
});

export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodType<T>>>>;
export type PaginatedResponse<T> = z.infer<ReturnType<typeof PaginatedResponseSchema<z.ZodType<T>>>>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type ParamId = z.infer<typeof ParamIdSchema>;