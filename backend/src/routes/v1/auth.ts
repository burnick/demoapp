import { z } from 'zod';
import { router as trpcRouter, baseProcedure, protectedProcedure } from '../../trpc/router';
import { AuthController } from '../../controllers/authController';
import { 
  LoginSchema, 
  RegisterSchema, 
  RefreshTokenSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  ForgotPasswordSchema
} from '../../schemas/auth';
import { ApiResponseSchema } from '../../schemas/common';

/**
 * Authentication routes for API v1
 */
export const authRouter = trpcRouter({
  // User registration
  register: baseProcedure
    .input(RegisterSchema)
    .output(ApiResponseSchema(z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        createdAt: z.date(),
      }),
      tokens: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.number(),
      }),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.register(input);
      return {
        success: true,
        data: {
          user: {
            ...result.user,
            createdAt: new Date(),
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
          },
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // User login
  login: baseProcedure
    .input(LoginSchema)
    .output(ApiResponseSchema(z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        lastLoginAt: z.date().nullable(),
      }),
      tokens: z.object({
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresIn: z.number(),
      }),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.login(input);
      return {
        success: true,
        data: {
          user: {
            ...result.user,
            lastLoginAt: new Date(),
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: 3600,
          },
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Refresh access token
  refreshToken: baseProcedure
    .input(RefreshTokenSchema)
    .output(ApiResponseSchema(z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresIn: z.number(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.refreshToken(input);
      return {
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 3600,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // User logout (protected)
  logout: protectedProcedure
    .output(ApiResponseSchema(z.object({
      success: z.boolean(),
      message: z.string(),
    })))
    .mutation(async ({ ctx }) => {
      const controller = new AuthController();
      const result = await controller.logout({}, ctx.user.id);
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Change password (protected)
  changePassword: protectedProcedure
    .input(ChangePasswordSchema)
    .output(ApiResponseSchema(z.object({
      success: z.boolean(),
      message: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.changePassword(input, ctx.user.id);
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Forgot password
  forgotPassword: baseProcedure
    .input(ForgotPasswordSchema)
    .output(ApiResponseSchema(z.object({
      success: z.boolean(),
      message: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.forgotPassword(input);
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Reset password
  resetPassword: baseProcedure
    .input(ResetPasswordSchema)
    .output(ApiResponseSchema(z.object({
      success: z.boolean(),
      message: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.resetPassword(input);
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Verify email token
  verifyEmail: baseProcedure
    .input(z.object({
      token: z.string().min(1, 'Token is required'),
    }))
    .output(ApiResponseSchema(z.object({
      success: z.boolean(),
      message: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const controller = new AuthController();
      const result = await controller.verifyEmail(input);
      return {
        success: true,
        data: {
          success: true,
          message: result.message,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Get current session info (protected)
  getSession: protectedProcedure
    .output(ApiResponseSchema(z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        emailVerified: z.boolean(),
        createdAt: z.date(),
        lastLoginAt: z.date().nullable(),
      }),
      session: z.object({
        issuedAt: z.date(),
        expiresAt: z.date(),
        userAgent: z.string().optional(),
        ipAddress: z.string().optional(),
      }),
    })))
    .query(async ({ ctx }) => {
      return {
        success: true,
        data: {
          user: {
            id: ctx.user.id,
            email: ctx.user.email,
            name: ctx.user.name,
            emailVerified: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
          },
          session: {
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            userAgent: ctx.req.headers['user-agent'],
            ipAddress: ctx.req.ip,
          },
        },
        timestamp: new Date().toISOString(),
      };
    }),
});

// Export the router
export const router = authRouter;

// Route metadata
export const meta = {
  version: 'v1',
  description: 'Authentication endpoints for API version 1',
  deprecated: false,
};