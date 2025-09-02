import { z } from 'zod';
import { PaginationSchema, DateTimeSchema } from './common';

// Search query schema
export const UserSearchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  from: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(50).default(10),
  highlight: z.boolean().default(true),
});

// User search filters schema
export const UserSearchFiltersSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  createdAfter: DateTimeSchema.optional(),
  createdBefore: DateTimeSchema.optional(),
}).merge(PaginationSchema);

// Search suggestions schema
export const SearchSuggestionsSchema = z.object({
  q: z.string().min(1, 'Query is required').max(50, 'Query too long'),
  field: z.enum(['name', 'email']).default('name'),
  size: z.number().int().min(1).max(10).default(5),
});

// Search result item schema
export const SearchResultItemSchema = z.object({
  id: z.string(),
  score: z.number(),
  source: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  highlight: z.record(z.array(z.string())).optional(),
});

// Search response schema
export const SearchResponseSchema = z.object({
  hits: z.array(SearchResultItemSchema),
  total: z.object({
    value: z.number().int().nonnegative(),
    relation: z.enum(['eq', 'gte']),
  }),
  maxScore: z.number().nullable(),
  took: z.number().int().nonnegative().optional(),
});

// Search suggestions response schema
export const SearchSuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

// Search stats response schema
export const SearchStatsResponseSchema = z.object({
  indexName: z.string(),
  documentCount: z.number().int().nonnegative(),
  indexSize: z.string(),
  searchCount: z.number().int().nonnegative().optional(),
});

// Type exports
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
export type UserSearchFilters = z.infer<typeof UserSearchFiltersSchema>;
export type SearchSuggestions = z.infer<typeof SearchSuggestionsSchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type SearchSuggestionsResponse = z.infer<typeof SearchSuggestionsResponseSchema>;
export type SearchStatsResponse = z.infer<typeof SearchStatsResponseSchema>;