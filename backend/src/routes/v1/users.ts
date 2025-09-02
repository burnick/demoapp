import { z } from 'zod';
import { router as trpcRouter, baseProcedure, protectedProcedure } from '../../trpc/router';
import { UserController } from '../../controllers/userController';
import { 
  UserSchema, 
  CreateUserSchema, 
  UpdateUserSchema, 
  UserQuerySchema 
} from '../../schemas/user';
import { PaginationSchema, ApiResponseSchema } from '../../schemas/common';

/**
 * User routes for API v1
 */
export const userRouter = trpcRouter({
  // Get all users with pagination
  getUsers: baseProcedure
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
  getUserById: baseProcedure
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
  createUser: protectedProcedure
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
  updateUser: protectedProcedure
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
  deleteUser: protectedProcedure
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
  getProfile: protectedProcedure
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
  updateProfile: protectedProcedure
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
});

// Export the router
export const router = userRouter;

// Route metadata
export const meta = {
  version: 'v1',
  description: 'User management endpoints for API version 1',
  deprecated: false,
};