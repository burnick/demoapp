import { z } from 'zod';
import { router as trpcRouter, openApiBaseProcedure, openApiProtectedProcedure } from '../../trpc/router';
import { createOpenApiMeta } from '../../utils/openapi';
import { UserController } from '../../controllers/userController';
import { 
  UserSchema, 
  CreateUserSchema, 
  UpdateUserSchema, 
  UserQuerySchema 
} from '../../schemas/user';
import { 
  UserSearchQuerySchema,
  UserSearchFiltersSchema,
  SearchSuggestionsSchema,
  SearchResponseSchema,
  SearchSuggestionsResponseSchema
} from '../../schemas/search';
import { PaginationSchema, ApiResponseSchema } from '../../schemas/common';

/**
 * User routes for API v1
 */
export const userRouter = trpcRouter({
  // Get all users with pagination
  getUsers: openApiBaseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users',
      summary: 'Get all users with pagination',
      description: 'Retrieve a paginated list of users with optional filtering',
      tags: ['Users'],
    }))
    .input(z.object({
      pagination: PaginationSchema.optional(),
      filters: UserQuerySchema.optional(),
    }))
    .output(ApiResponseSchema(z.object({
      users: z.array(UserSchema),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    })))
    .query(async ({ input, ctx }) => {
      const controller = new UserController();
      const result = await controller.listUsers(input);
      return {
        success: true,
        data: {
          users: result.users,
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Get user by ID
  getUserById: openApiBaseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/{id}',
      summary: 'Get user by ID',
      description: 'Retrieve a specific user by their unique identifier',
      tags: ['Users'],
    }))
    .input(z.object({
      id: z.string().uuid('Invalid user ID format'),
    }))
    .output(ApiResponseSchema(UserSchema))
    .query(async ({ input, ctx }) => {
      const controller = new UserController();
      const user = await controller.getUserById(input.id, ctx.user?.id);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };
    }),

  // Create new user (protected)
  createUser: openApiProtectedProcedure
    .meta(createOpenApiMeta({
      method: 'POST',
      path: '/v1/users',
      summary: 'Create new user',
      description: 'Create a new user account (requires authentication)',
      tags: ['Users'],
      protect: true,
    }))
    .input(CreateUserSchema)
    .output(ApiResponseSchema(UserSchema))
    .mutation(async ({ input, ctx }) => {
      const controller = new UserController();
      const user = await controller.createUser(input);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };
    }),

  // Update user (protected)
  updateUser: openApiProtectedProcedure
    .meta(createOpenApiMeta({
      method: 'PUT',
      path: '/v1/users/{id}',
      summary: 'Update user',
      description: 'Update an existing user (requires authentication)',
      tags: ['Users'],
      protect: true,
    }))
    .input(z.object({
      id: z.string().uuid('Invalid user ID format'),
      data: UpdateUserSchema,
    }))
    .output(ApiResponseSchema(UserSchema))
    .mutation(async ({ input, ctx }) => {
      const controller = new UserController();
      const user = await controller.updateUser(input.id, input.data, ctx.user.id);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };
    }),

  // Delete user (protected)
  deleteUser: openApiProtectedProcedure
    .meta(createOpenApiMeta({
      method: 'DELETE',
      path: '/v1/users/{id}',
      summary: 'Delete user',
      description: 'Delete an existing user (requires authentication)',
      tags: ['Users'],
      protect: true,
    }))
    .input(z.object({
      id: z.string().uuid('Invalid user ID format'),
    }))
    .output(ApiResponseSchema(z.object({
      deleted: z.boolean(),
      id: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new UserController();
      await controller.deleteUser(input.id, ctx.user.id);
      return {
        success: true,
        data: {
          deleted: true,
          id: input.id,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Get current user profile (protected)
  getProfile: openApiProtectedProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/profile',
      summary: 'Get current user profile',
      description: 'Get the profile of the currently authenticated user',
      tags: ['Users'],
      protect: true,
    }))
    .output(ApiResponseSchema(UserSchema))
    .query(async ({ ctx }) => {
      const controller = new UserController();
      const user = await controller.getUserById(ctx.user.id, ctx.user.id);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };
    }),

  // Update current user profile (protected)
  updateProfile: openApiProtectedProcedure
    .meta(createOpenApiMeta({
      method: 'PUT',
      path: '/v1/users/profile',
      summary: 'Update current user profile',
      description: 'Update the profile of the currently authenticated user',
      tags: ['Users'],
      protect: true,
    }))
    .input(UpdateUserSchema)
    .output(ApiResponseSchema(UserSchema))
    .mutation(async ({ input, ctx }) => {
      const controller = new UserController();
      const user = await controller.updateUser(ctx.user.id, input, ctx.user.id);
      return {
        success: true,
        data: user,
        timestamp: new Date().toISOString(),
      };
    }),

  // Search users with text query
  searchUsers: openApiBaseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/search',
      summary: 'Search users',
      description: 'Search users using text query with pagination',
      tags: ['Users', 'Search'],
    }))
    .input(UserSearchQuerySchema)
    .output(ApiResponseSchema(SearchResponseSchema))
    .query(async ({ input }) => {
      const controller = new UserController();
      const result = await controller.searchUsers(input);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    }),

  // Advanced search users with filters
  advancedSearchUsers: openApiBaseProcedure
    .meta(createOpenApiMeta({
      method: 'POST',
      path: '/v1/users/search/advanced',
      summary: 'Advanced user search',
      description: 'Search users with advanced filters and criteria',
      tags: ['Users', 'Search'],
    }))
    .input(UserSearchFiltersSchema)
    .output(ApiResponseSchema(SearchResponseSchema))
    .query(async ({ input }) => {
      const controller = new UserController();
      const result = await controller.advancedSearchUsers(input);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    }),

  // Get user search suggestions
  getUserSuggestions: openApiBaseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/suggestions',
      summary: 'Get user search suggestions',
      description: 'Get search suggestions for user queries',
      tags: ['Users', 'Search'],
    }))
    .input(SearchSuggestionsSchema)
    .output(ApiResponseSchema(SearchSuggestionsResponseSchema))
    .query(async ({ input }) => {
      const controller = new UserController();
      const result = await controller.getUserSuggestions(input);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    }),
});

// Export the router
export const router = userRouter;

// Route metadata
export const meta = {
  version: 'v1',
  description: 'User management endpoints for API version 1',
  deprecated: false,
};