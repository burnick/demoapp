import { UserController, AuthController } from '../controllers';
import { prisma } from '../prisma/client';
import { TestAssertions, MockDataGenerator } from './testUtils';

// Mock Prisma client
jest.mock('../prisma/client', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('Controllers', () => {
  let userController: UserController;
  let authController: AuthController;

  beforeEach(() => {
    userController = new UserController();
    authController = new AuthController();
    jest.clearAllMocks();
  });

  describe('UserController', () => {
    describe('createUser', () => {
      it('should create a user successfully', async () => {
        const mockUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

        const result = await userController.createUser({
          email: 'test@example.com',
          name: 'Test User',
        });

        expect(result).toEqual(mockUser);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: 'test@example.com' },
        });
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: { email: 'test@example.com', name: 'Test User', password: 'temp_password' },
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        });
      });

      it('should throw ConflictError if user already exists', async () => {
        const existingUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Existing User',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

        await expect(
          userController.createUser({
            email: 'test@example.com',
            name: 'Test User',
          })
        ).rejects.toThrow('User with this email already exists');
      });

      it('should throw ValidationError for invalid input', async () => {
        await expect(
          userController.createUser({
            email: 'invalid-email',
            name: '',
          })
        ).rejects.toThrow();
      });
    });

    describe('getUserById', () => {
      it('should get user by ID successfully', async () => {
        const mockUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        const result = await userController.getUserById('550e8400-e29b-41d4-a716-446655440000');

        expect(result).toEqual(mockUser);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: '550e8400-e29b-41d4-a716-446655440000' },
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true },
        });
      });

      it('should throw NotFoundError if user does not exist', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(userController.getUserById('550e8400-e29b-41d4-a716-446655440000')).rejects.toThrow('User not found');
      });
    });

    describe('listUsers', () => {
      it('should list users with pagination', async () => {
        const mockUsers = [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'test1@example.com',
            name: 'Test User 1',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            email: 'test2@example.com',
            name: 'Test User 2',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        ];

        (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
        (prisma.user.count as jest.Mock).mockResolvedValue(2);

        const result = await userController.listUsers({
          page: 1,
          limit: 10,
        });

        expect(result.users).toEqual(mockUsers);
        expect(result.total).toBe(2);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(10);
      });
    });
  });

  describe('AuthController', () => {
    describe('register', () => {
      it('should register a user successfully', async () => {
        const mockUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

        const result = await authController.register({
          email: 'test@example.com',
          name: 'Test User',
          password: 'Password123',
          confirmPassword: 'Password123',
        });

        expect(result.user).toEqual({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
        });
        expect(result.message).toBe('User registered successfully. Please verify your email.');
      });

      it('should throw ConflictError if user already exists', async () => {
        const existingUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Existing User',
          password: 'hashedpassword',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

        await expect(
          authController.register({
            email: 'test@example.com',
            name: 'Test User',
            password: 'Password123',
            confirmPassword: 'Password123',
          })
        ).rejects.toThrow('User with this email already exists');
      });
    });

    describe('login', () => {
      it('should login successfully', async () => {
        const bcrypt = require('bcryptjs');
        const mockUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
          password: await bcrypt.hash('Password123', 12),
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        const result = await authController.login({
          email: 'test@example.com',
          password: 'Password123',
        });

        expect(result.user).toEqual({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          name: 'Test User',
        });
        expect(result.accessToken).toBeDefined();
        expect(result.refreshToken).toBeDefined();
        expect(result.expiresAt).toBeDefined();
      });

      it('should throw AuthenticationError for invalid credentials', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(
          authController.login({
            email: 'test@example.com',
            password: 'WrongPassword123',
          })
        ).rejects.toThrow('Invalid email or password');
      });
    });
  });
});