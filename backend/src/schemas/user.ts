import { z } from "zod";
import {
  IdSchema,
  EmailSchema,
  DateTimeSchema,
  PaginationSchema,
  SortOrderSchema,
} from "./common";

// Base User schema
export const UserSchema = z.object({
  id: IdSchema,
  email: EmailSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
});

// User creation schema (for API input)
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
});

// User update schema (partial updates allowed)
export const UpdateUserSchema = z
  .object({
    email: EmailSchema.optional(),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// User query/filter schema
export const UserQuerySchema = z
  .object({
    email: z.string().optional(),
    name: z.string().optional(),
    search: z.string().min(1).optional(), // For searching across name and email
    createdAfter: DateTimeSchema.optional(),
    createdBefore: DateTimeSchema.optional(),
  })
  .merge(PaginationSchema);

// User sorting schema
export const UserSortSchema = z.object({
  sortBy: z
    .enum(["name", "email", "createdAt", "updatedAt"])
    .default("createdAt"),
  order: SortOrderSchema,
});

// Combined user list query schema
export const UserListQuerySchema = UserQuerySchema.merge(UserSortSchema);

// User response schemas (what gets returned from API)
export const UserResponseSchema = UserSchema;

export const UserListResponseSchema = z.object({
  users: z.array(UserResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// User profile schema (extended user info)
export const UserProfileSchema = UserSchema.extend({
  lastLoginAt: DateTimeSchema.nullable(),
  isActive: z.boolean().default(true),
});

// Bulk operations schemas
export const BulkDeleteUsersSchema = z.object({
  userIds: z
    .array(IdSchema)
    .min(1, "At least one user ID is required")
    .max(50, "Cannot delete more than 50 users at once"),
});

export const BulkUpdateUsersSchema = z.object({
  userIds: z
    .array(IdSchema)
    .min(1, "At least one user ID is required")
    .max(50, "Cannot update more than 50 users at once"),
  updates: UpdateUserSchema,
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type UserQuery = z.infer<typeof UserQuerySchema>;
export type UserSort = z.infer<typeof UserSortSchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type BulkDeleteUsers = z.infer<typeof BulkDeleteUsersSchema>;
export type BulkUpdateUsers = z.infer<typeof BulkUpdateUsersSchema>;
