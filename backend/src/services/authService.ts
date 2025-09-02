import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma, withTransaction } from '../prisma/client';
import { UserService } from './userService';
import {
  Login,
  Register,
  RefreshToken,
  ChangePassword,
  ResetPassword,
  JWTPayload
} from '../schemas/auth';
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ConfigurationError
} from '../utils/errors';
import { logger } from '../utils/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly ACCESS_TOKEN_EXPIRES_IN = '15m';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  /**
   * Get JWT secret from environment
   */
  private static getJWTSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new ConfigurationError('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      return hashedPassword;
    } catch (error) {
      logger.error('Failed to hash password', { error });
      throw new DatabaseError('Failed to process password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Failed to verify password', { error });
      throw new DatabaseError('Failed to verify password');
    }
  }

  /**
   * Generate JWT tokens
   */
  static generateTokens(user: AuthUser): AuthTokens {
    try {
      const secret = this.getJWTSecret();
      const now = new Date();

      // Generate access token
      const accessTokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        type: 'access'
      };

      const accessToken = jwt.sign(accessTokenPayload, secret, {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
        issuer: 'backend-api',
        audience: 'backend-api-client'
      });

      // Generate refresh token
      const refreshTokenPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        type: 'refresh'
      };

      const refreshToken = jwt.sign(refreshTokenPayload, secret, {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'backend-api',
        audience: 'backend-api-client'
      });

      // Calculate expiration time (15 minutes from now)
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

      return {
        accessToken,
        refreshToken,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to generate tokens', { error, userId: user.id });
      throw new DatabaseError('Failed to generate authentication tokens');
    }
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string, expectedType: 'access' | 'refresh' = 'access'): JWTPayload {
    try {
      const secret = this.getJWTSecret();
      
      const decoded = jwt.verify(token, secret, {
        issuer: 'backend-api',
        audience: 'backend-api-client'
      }) as JWTPayload;

      if (decoded.type !== expectedType) {
        throw new AuthenticationError(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      }
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logger.error('Failed to verify token', { error });
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Register a new user
   */
  static async register(registerData: Register): Promise<{ user: AuthUser; message: string }> {
    try {
      return await withTransaction(async (tx) => {
        // Check if user already exists
        const existingUser = await tx.user.findUnique({
          where: { email: registerData.email }
        });

        if (existingUser) {
          throw new ConflictError('User with this email already exists', {
            email: registerData.email
          });
        }

        // Hash password
        const hashedPassword = await this.hashPassword(registerData.password);

        // Create user
        const user = await tx.user.create({
          data: {
            email: registerData.email,
            name: registerData.name,
            password: hashedPassword
          }
        });

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name
        };

        logger.info('User registered successfully', { userId: user.id, email: user.email });

        return {
          user: authUser,
          message: 'User registered successfully'
        };
      });
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Failed to register user', { error, email: registerData.email });
      throw new DatabaseError('Failed to register user');
    }
  }

  /**
   * Login user with email and password
   */
  static async login(loginData: Login): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: loginData.email }
      });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(loginData.password, user.password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      // Generate tokens
      const tokens = this.generateTokens(authUser);

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return {
        user: authUser,
        tokens
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      logger.error('Failed to login user', { error, email: loginData.email });
      throw new DatabaseError('Login failed');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshTokenData: RefreshToken): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshTokenData.refreshToken, 'refresh');

      // Get user to ensure they still exist
      const user = await UserService.getUserById(decoded.userId);

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      // Generate new tokens
      const tokens = this.generateTokens(authUser);

      logger.info('Token refreshed successfully', { userId: user.id });

      return tokens;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      logger.error('Failed to refresh token', { error });
      throw new DatabaseError('Token refresh failed');
    }
  }

  /**
   * Change user password (for authenticated users)
   */
  static async changePassword(userId: string, changePasswordData: ChangePassword): Promise<{ message: string }> {
    try {
      return await withTransaction(async (tx) => {
        // Get user
        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new NotFoundError('User');
        }

        // Verify current password
        const isCurrentPasswordValid = await this.verifyPassword(
          changePasswordData.currentPassword,
          user.password
        );

        if (!isCurrentPasswordValid) {
          throw new AuthenticationError('Current password is incorrect');
        }

        // Hash new password
        const hashedNewPassword = await this.hashPassword(changePasswordData.newPassword);

        // Update password
        await tx.user.update({
          where: { id: userId },
          data: { password: hashedNewPassword }
        });

        logger.info('Password changed successfully', { userId });

        return { message: 'Password changed successfully' };
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AuthenticationError) {
        throw error;
      }
      
      logger.error('Failed to change password', { error, userId });
      throw new DatabaseError('Failed to change password');
    }
  }

  /**
   * Reset password using reset token (simplified version)
   * Note: In a real application, you would implement email-based password reset
   */
  static async resetPassword(resetPasswordData: ResetPassword): Promise<{ message: string }> {
    try {
      // In a real implementation, you would:
      // 1. Verify the reset token (stored in database or JWT)
      // 2. Find the user associated with the token
      // 3. Check token expiration
      // For this simplified version, we'll assume the token contains the user ID

      let userId: string;
      try {
        // Assuming the token is a JWT containing user ID
        const decoded = this.verifyToken(resetPasswordData.token, 'access');
        userId = decoded.userId;
      } catch {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      return await withTransaction(async (tx) => {
        // Get user
        const user = await tx.user.findUnique({
          where: { id: userId }
        });

        if (!user) {
          throw new NotFoundError('User');
        }

        // Hash new password
        const hashedPassword = await this.hashPassword(resetPasswordData.password);

        // Update password
        await tx.user.update({
          where: { id: userId },
          data: { password: hashedPassword }
        });

        logger.info('Password reset successfully', { userId });

        return { message: 'Password reset successfully' };
      });
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Failed to reset password', { error });
      throw new DatabaseError('Failed to reset password');
    }
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token: string): Promise<AuthUser> {
    try {
      const decoded = this.verifyToken(token, 'access');
      const user = await UserService.getUserById(decoded.userId);

      return {
        id: user.id,
        email: user.email,
        name: user.name
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw new AuthenticationError('Invalid token');
      }
      
      logger.error('Failed to get user from token', { error });
      throw new AuthenticationError('Token validation failed');
    }
  }

  /**
   * Validate token and return user (for middleware)
   */
  static async validateToken(token: string): Promise<AuthUser | null> {
    try {
      return await this.getUserFromToken(token);
    } catch (error) {
      // Return null for invalid tokens instead of throwing
      // This allows middleware to handle unauthenticated requests gracefully
      return null;
    }
  }

  /**
   * Generate password reset token (simplified)
   * In a real application, this would generate a secure token and store it in the database
   */
  static async generatePasswordResetToken(email: string): Promise<{ token: string; message: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return { 
          token: '', 
          message: 'If an account with that email exists, a password reset link has been sent.' 
        };
      }

      // Generate a temporary token (in real app, store this in database with expiration)
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      const tokens = this.generateTokens(authUser);

      logger.info('Password reset token generated', { userId: user.id, email });

      return {
        token: tokens.accessToken, // In real app, generate a separate reset token
        message: 'If an account with that email exists, a password reset link has been sent.'
      };
    } catch (error) {
      logger.error('Failed to generate password reset token', { error, email });
      throw new DatabaseError('Failed to generate password reset token');
    }
  }

  /**
   * Update user password directly (admin function)
   */
  static async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      logger.info('User password updated by admin', { userId });
    } catch (error) {
      logger.error('Failed to update user password', { error, userId });
      throw new DatabaseError('Failed to update password');
    }
  }
}