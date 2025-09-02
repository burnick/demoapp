import { z } from 'zod';
import { EmailSchema, PasswordSchema, IdSchema, DateTimeSchema } from './common';

// Login schemas
export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const LoginResponseSchema = z.object({
  user: z.object({
    id: IdSchema,
    email: EmailSchema,
    name: z.string(),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: DateTimeSchema,
});

// Registration schemas
export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export const RegisterResponseSchema = z.object({
  user: z.object({
    id: IdSchema,
    email: EmailSchema,
    name: z.string(),
  }),
  message: z.string(),
});

// Token schemas
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: DateTimeSchema,
});

// Password reset schemas
export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
});

// Change password schema (for authenticated users)
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordSchema,
  confirmNewPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmNewPassword,
  {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  }
).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  }
);

export const ChangePasswordResponseSchema = z.object({
  message: z.string(),
});

// Logout schema
export const LogoutSchema = z.object({
  refreshToken: z.string().optional(), // Optional for logout all devices
});

export const LogoutResponseSchema = z.object({
  message: z.string(),
});

// Session/JWT payload schema
export const JWTPayloadSchema = z.object({
  userId: IdSchema,
  email: EmailSchema,
  iat: z.number(),
  exp: z.number(),
  type: z.enum(['access', 'refresh']),
});

// Email verification schemas
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const VerifyEmailResponseSchema = z.object({
  message: z.string(),
});

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});

export const ResendVerificationResponseSchema = z.object({
  message: z.string(),
});

// Auth context schema (for middleware)
export const AuthContextSchema = z.object({
  user: z.object({
    id: IdSchema,
    email: EmailSchema,
    name: z.string(),
  }),
  isAuthenticated: z.boolean(),
});

// Type exports
export type Login = z.infer<typeof LoginSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;
export type Logout = z.infer<typeof LogoutSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;
export type VerifyEmail = z.infer<typeof VerifyEmailSchema>;
export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;
export type ResendVerification = z.infer<typeof ResendVerificationSchema>;
export type ResendVerificationResponse = z.infer<typeof ResendVerificationResponseSchema>;
export type AuthContext = z.infer<typeof AuthContextSchema>;