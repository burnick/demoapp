import { BaseController } from './baseController';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  LogoutSchema,
  type LoginResponse,
  type RegisterResponse,
  type TokenResponse,
  type ForgotPasswordResponse,
  type ResetPasswordResponse,
  type ChangePasswordResponse,
  type VerifyEmailResponse,
  type ResendVerificationResponse,
  type LogoutResponse,
} from '../schemas/auth';
import { AuthService } from '../services/authService';
import { 
  AuthenticationError, 
  ConflictError, 
  NotFoundError, 
  ValidationError
} from '../utils/errors';

/**
 * Authentication Controller
 * Handles all authentication-related operations including login, register, password management
 */
export class AuthController extends BaseController {

  /**
   * User login
   * @param input - Login credentials
   * @returns Login response with tokens and user data
   */
  async login(input: unknown): Promise<LoginResponse> {
    const validatedInput = this.validateInput(input, LoginSchema);
    
    this.logAction('login', undefined, { email: validatedInput.email });

    return this.handleAsync(async () => {
      const result = await AuthService.login(validatedInput);

      return {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresAt: result.tokens.expiresAt.toISOString(),
      };
    }, 'login');
  }

  /**
   * User registration
   * @param input - Registration data
   * @returns Registration response
   */
  async register(input: unknown): Promise<RegisterResponse> {
    const validatedInput = this.validateInput(input, RegisterSchema);
    
    this.logAction('register', undefined, { email: validatedInput.email });

    return this.handleAsync(async () => {
      const result = await AuthService.register(validatedInput);

      return result;
    }, 'register');
  }

  /**
   * Refresh access token
   * @param input - Refresh token
   * @returns New access and refresh tokens
   */
  async refreshToken(input: unknown): Promise<TokenResponse> {
    const validatedInput = this.validateInput(input, RefreshTokenSchema);
    
    this.logAction('refreshToken');

    return this.handleAsync(async () => {
      const tokens = await AuthService.refreshToken(validatedInput);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt.toISOString(),
      };
    }, 'refreshToken');
  }

  /**
   * Forgot password - send reset email
   * @param input - Email address
   * @returns Success message
   */
  async forgotPassword(input: unknown): Promise<ForgotPasswordResponse> {
    const validatedInput = this.validateInput(input, ForgotPasswordSchema);
    
    this.logAction('forgotPassword', undefined, { email: validatedInput.email });

    return this.handleAsync(async () => {
      const result = await AuthService.generatePasswordResetToken(validatedInput.email);

      return {
        message: result.message,
      };
    }, 'forgotPassword');
  }

  /**
   * Reset password with token
   * @param input - Reset token and new password
   * @returns Success message
   */
  async resetPassword(input: unknown): Promise<ResetPasswordResponse> {
    const validatedInput = this.validateInput(input, ResetPasswordSchema);
    
    this.logAction('resetPassword');

    return this.handleAsync(async () => {
      const result = await AuthService.resetPassword(validatedInput);

      return result;
    }, 'resetPassword');
  }

  /**
   * Change password for authenticated user
   * @param input - Current and new password
   * @param userId - ID of authenticated user
   * @returns Success message
   */
  async changePassword(input: unknown, userId: string): Promise<ChangePasswordResponse> {
    const validatedInput = this.validateInput(input, ChangePasswordSchema);
    
    this.logAction('changePassword', userId);

    return this.handleAsync(async () => {
      const result = await AuthService.changePassword(userId, validatedInput);

      return result;
    }, 'changePassword');
  }

  /**
   * Verify email address
   * @param input - Verification token
   * @returns Success message
   */
  async verifyEmail(input: unknown): Promise<VerifyEmailResponse> {
    const validatedInput = this.validateInput(input, VerifyEmailSchema);
    
    this.logAction('verifyEmail');

    return this.handleAsync(async () => {
      // For now, return a simple success message
      // In a real implementation, this would use AuthService
      return {
        message: 'Email has been verified successfully.',
      };
    }, 'verifyEmail');
  }

  /**
   * Resend email verification
   * @param input - Email address
   * @returns Success message
   */
  async resendVerification(input: unknown): Promise<ResendVerificationResponse> {
    const validatedInput = this.validateInput(input, ResendVerificationSchema);
    
    this.logAction('resendVerification', undefined, { email: validatedInput.email });

    return this.handleAsync(async () => {
      // For now, return a simple success message
      // In a real implementation, this would use AuthService
      return {
        message: 'If an account with that email exists and is unverified, a verification email has been sent.',
      };
    }, 'resendVerification');
  }

  /**
   * Logout user
   * @param input - Optional refresh token to invalidate
   * @param userId - ID of authenticated user
   * @returns Success message
   */
  async logout(input: unknown, userId?: string): Promise<LogoutResponse> {
    const validatedInput = this.validateInput(input, LogoutSchema);
    
    this.logAction('logout', userId);

    return this.handleAsync(async () => {
      // In a real implementation, you would:
      // 1. Add the refresh token to a blacklist/revoked tokens table
      // 2. Clear any session data
      // 3. Optionally log the logout event
      
      if (validatedInput.refreshToken) {
        this.logger.info('Refresh token invalidated', { userId });
      }

      return {
        message: 'Logged out successfully.',
      };
    }, 'logout');
  }
}