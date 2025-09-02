/**
 * Controllers Index
 * Exports all controller classes for easy importing
 */

export { BaseController } from './baseController';
export { UserController } from './userController';
export { AuthController } from './authController';

// Re-export controller types for convenience
export type {
  CreateUser,
  UpdateUser,
  UserListQuery,
  UserResponse,
  UserListResponse,
  BulkDeleteUsers,
  BulkUpdateUsers,
} from '../schemas/user';

export type {
  Login,
  Register,
  RefreshToken,
  ForgotPassword,
  ResetPassword,
  ChangePassword,
  VerifyEmail,
  ResendVerification,
  Logout,
  LoginResponse,
  RegisterResponse,
  TokenResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  VerifyEmailResponse,
  ResendVerificationResponse,
  LogoutResponse,
} from '../schemas/auth';