import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  JsonWebTokenError: class JsonWebTokenError extends Error {},
  TokenExpiredError: class TokenExpiredError extends Error {},
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the prisma client
const mockPrisma = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as any;

jest.mock('../prisma/client', () => ({
  prisma: mockPrisma,
  withTransaction: jest.fn((callback: any) => callback(mockPrisma)),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

import { UserService } from '../services/userService';
import { AuthService } from '../services/authService';
import { 
  NotFoundError, 
  ConflictError, 
  DatabaseError, 
  ValidationError,
  AuthenticationError 
} from '../utils/errors';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const createdUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await UserService.createUser(userData);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email }
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          name: userData.name,
          password: '',
        }
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictError if user already exists', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const existingUser = { id: '1', email: 'test@example.com' };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(UserService.createUser(userData)).rejects.toThrow(ConflictError);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError on database failure', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      await expect(UserService.createUser(userData)).rejects.toThrow(DatabaseError);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const userId = '1';
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await UserService.getUserById(userId);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
      expect(result).toEqual(user);
    });

    it('should throw NotFoundError when user not found', async () => {
      const userId = '1';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(UserService.getUserById(userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = '1';
      const updateData = { name: 'Updated Name' };
      const existingUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updatedUser = { ...existingUser, name: 'Updated Name' };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await UserService.updateUser(userId, updateData);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData
      });
      expect(result).toEqual(updatedUser);
    });

    it('should check for email conflicts when updating email', async () => {
      const userId = '1';
      const updateData = { email: 'new@example.com' };
      const existingUser = {
        id: '1',
        email: 'old@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser) // First call for user existence
        .mockResolvedValueOnce({ id: '2', email: 'new@example.com' }); // Second call for email conflict

      await expect(UserService.updateUser(userId, updateData)).rejects.toThrow(ConflictError);
    });
  });

  describe('listUsers', () => {
    it('should return paginated users list', async () => {
      const query = { page: 1, limit: 10, sortBy: 'createdAt' as const, order: 'desc' as const };
      const users = [
        { id: '1', email: 'user1@example.com', name: 'User 1', password: 'hash1', createdAt: new Date(), updatedAt: new Date() },
        { id: '2', email: 'user2@example.com', name: 'User 2', password: 'hash2', createdAt: new Date(), updatedAt: new Date() },
      ];
      const total = 2;

      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(total);

      const result = await UserService.listUsers(query);

      expect(result).toEqual({
        users,
        total,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle search functionality', async () => {
      const query = { 
        page: 1, 
        limit: 10, 
        search: 'test',
        sortBy: 'createdAt' as const, 
        order: 'desc' as const 
      };

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await UserService.listUsers(query);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'test', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('bulkDeleteUsers', () => {
    it('should delete multiple users successfully', async () => {
      const userIds = ['1', '2', '3'];
      const existingUsers = [
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ];

      mockPrisma.user.findMany.mockResolvedValue(existingUsers);
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 3 });

      const result = await UserService.bulkDeleteUsers({ userIds });

      expect(result).toEqual({ count: 3 });
      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: userIds } }
      });
    });

    it('should throw NotFoundError if some users do not exist', async () => {
      const userIds = ['1', '2', '3'];
      const existingUsers = [{ id: '1' }, { id: '2' }]; // Missing user '3'

      mockPrisma.user.findMany.mockResolvedValue(existingUsers);

      await expect(UserService.bulkDeleteUsers({ userIds })).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchUsers', () => {
    it('should search users by term', async () => {
      const searchTerm = 'john';
      const users = [
        { id: '1', email: 'john@example.com', name: 'John Doe', password: 'hash', createdAt: new Date(), updatedAt: new Date() }
      ];

      mockPrisma.user.findMany.mockResolvedValue(users);

      const result = await UserService.searchUsers(searchTerm);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: searchTerm, mode: 'insensitive' } },
            { name: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual(users);
    });

    it('should throw ValidationError for empty search term', async () => {
      await expect(UserService.searchUsers('')).rejects.toThrow(ValidationError);
      await expect(UserService.searchUsers('   ')).rejects.toThrow(ValidationError);
    });
  });
});

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashedpassword';

      bcrypt.hash.mockResolvedValue(hashedPassword);

      const result = await AuthService.hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      expect(result).toBe(hashedPassword);
    });

    it('should throw DatabaseError on bcrypt failure', async () => {
      const password = 'testpassword';

      bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      await expect(AuthService.hashPassword(password)).rejects.toThrow(DatabaseError);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashedpassword';

      bcrypt.compare.mockResolvedValue(true);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashedpassword';

      bcrypt.compare.mockResolvedValue(false);

      const result = await AuthService.verifyPassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test User' };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      jwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = AuthService.generateTokens(user);

      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', () => {
      const token = 'valid-token';
      const decoded = {
        userId: '1',
        email: 'test@example.com',
        type: 'access',
        iat: 1234567890,
        exp: 1234567890
      };

      jwt.verify.mockReturnValue(decoded);

      const result = AuthService.verifyToken(token, 'access');

      expect(jwt.verify).toHaveBeenCalledWith(token, 'test-secret', {
        issuer: 'backend-api',
        audience: 'backend-api-client'
      });
      expect(result).toEqual(decoded);
    });

    it('should throw AuthenticationError for invalid token type', () => {
      const token = 'valid-token';
      const decoded = {
        userId: '1',
        email: 'test@example.com',
        type: 'refresh',
        iat: 1234567890,
        exp: 1234567890
      };

      jwt.verify.mockReturnValue(decoded);

      expect(() => AuthService.verifyToken(token, 'access')).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for expired token', () => {
      const token = 'expired-token';

      jwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      expect(() => AuthService.verifyToken(token)).toThrow(AuthenticationError);
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        confirmPassword: 'password123'
      };
      const hashedPassword = 'hashedpassword';
      const createdUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await AuthService.register(registerData);

      expect(result.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      });
      expect(result.message).toBe('User registered successfully');
    });

    it('should throw ConflictError if user already exists', async () => {
      const registerData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        confirmPassword: 'password123'
      };
      const existingUser = { id: '1', email: 'test@example.com' };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      await expect(AuthService.register(registerData)).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      mockPrisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);

      const result = await AuthService.login(loginData);

      expect(result.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      });
      expect(result.tokens.accessToken).toBe(accessToken);
      expect(result.tokens.refreshToken).toBe(refreshToken);
    });

    it('should throw AuthenticationError for invalid email', async () => {
      const loginData = { email: 'test@example.com', password: 'password123' };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AuthService.login(loginData)).rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for invalid password', async () => {
      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.login(loginData)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenData = { refreshToken: 'valid-refresh-token' };
      const decoded = {
        userId: '1',
        email: 'test@example.com',
        type: 'refresh',
        iat: 1234567890,
        exp: 1234567890
      };
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newAccessToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      jwt.verify.mockReturnValue(decoded);
      mockPrisma.user.findUnique.mockResolvedValue(user);
      jwt.sign
        .mockReturnValueOnce(newAccessToken)
        .mockReturnValueOnce(newRefreshToken);

      const result = await AuthService.refreshToken(refreshTokenData);

      expect(result.accessToken).toBe(newAccessToken);
      expect(result.refreshToken).toBe(newRefreshToken);
    });

    it('should throw AuthenticationError for invalid refresh token', async () => {
      const refreshTokenData = { refreshToken: 'invalid-refresh-token' };

      jwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await expect(AuthService.refreshToken(refreshTokenData)).rejects.toThrow(AuthenticationError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = '1';
      const changePasswordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
        confirmNewPassword: 'newpassword'
      };
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'oldhashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newHashedPassword = 'newhashedpassword';

      mockPrisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue(newHashedPassword);
      mockPrisma.user.update.mockResolvedValue({ ...user, password: newHashedPassword });

      const result = await AuthService.changePassword(userId, changePasswordData);

      expect(result.message).toBe('Password changed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: newHashedPassword }
      });
    });

    it('should throw AuthenticationError for incorrect current password', async () => {
      const userId = '1';
      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
        confirmNewPassword: 'newpassword'
      };
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.changePassword(userId, changePasswordData)).rejects.toThrow(AuthenticationError);
    });
  });
});