import { describe, it, expect } from '@jest/globals';
import { createContext, requireAuth, type AuthUser } from '../trpc/context';
import { appRouter } from '../trpc/router';
import { Request, Response } from 'express';

// Mock Prisma client
jest.mock('../prisma/client', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
  },
}));

describe('tRPC Server Foundation', () => {

  describe('Context Creation', () => {
    it('should create context without authentication', async () => {
      const mockReq = {
        headers: {},
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      } as Request;
      
      const mockRes = {} as Response;

      const context = await createContext({ req: mockReq, res: mockRes });

      expect(context).toMatchObject({
        req: mockReq,
        res: mockRes,
        user: undefined,
      });
      expect(context.requestId).toBeDefined();
      expect(context.startTime).toBeDefined();
      expect(typeof context.startTime).toBe('number');
    });

    it('should handle invalid JWT token gracefully', async () => {
      const mockReq = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        ip: '127.0.0.1',
        connection: { remoteAddress: '127.0.0.1' },
      } as Request;
      
      const mockRes = {} as Response;

      const context = await createContext({ req: mockReq, res: mockRes });

      expect(context.user).toBeUndefined();
    });
  });

  describe('Authentication Helper', () => {
    it('should throw error when user is not authenticated', () => {
      const mockContext = {
        user: undefined,
        requestId: 'test-id',
        startTime: Date.now(),
      } as any;

      expect(() => requireAuth(mockContext)).toThrow('Authentication required');
    });

    it('should return authenticated context when user exists', () => {
      const mockUser: AuthUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockContext = {
        user: mockUser,
        requestId: 'test-id',
        startTime: Date.now(),
      } as any;

      const result = requireAuth(mockContext);
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('tRPC Router', () => {
    it('should have health procedure defined', () => {
      expect(appRouter._def.procedures.health).toBeDefined();
    });

    it('should export correct router type', () => {
      expect(typeof appRouter).toBe('object');
      expect(appRouter._def).toBeDefined();
      expect(appRouter._def.procedures).toBeDefined();
    });
  });
});