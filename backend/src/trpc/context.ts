import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { Logger } from '../utils/logger';
import { AuthenticationError } from '../utils/errors';
import jwt from 'jsonwebtoken';
import { getJWTConfig } from '../utils/config';

/**
 * User information extracted from JWT token
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * tRPC Context interface
 */
export interface Context {
  req: Request;
  res: Response;
  prisma: typeof prisma;
  user: AuthUser | undefined;
  requestId: string;
  startTime: number;
}

/**
 * Create context for tRPC procedures
 * This function is called for every request and provides shared context
 */
export const createContext = async ({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> => {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Extract user from Authorization header if present
  let user: AuthUser | undefined;
  
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtConfig = getJWTConfig();
      const decoded = jwt.verify(token, jwtConfig.secret) as any;
      
      // Validate token payload structure
      if (decoded && typeof decoded === 'object' && decoded.id && decoded.email) {
        user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || '',
        };
      }
    }
  } catch (error) {
    // Invalid token - user remains undefined
    // We don't throw here to allow procedures to handle auth themselves
    Logger.debug('Invalid JWT token in request', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Log request start
  Logger.http('tRPC Request Started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    userId: user?.id,
  });

  return {
    req,
    res,
    prisma,
    user,
    requestId,
    startTime,
  };
};

/**
 * Generate unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Context type for use in procedures
 */
export type TRPCContext = Context;

/**
 * Authenticated context type - ensures user is present
 */
export interface AuthenticatedContext extends Context {
  user: AuthUser;
}

/**
 * Helper to ensure user is authenticated in procedures
 */
export const requireAuth = (ctx: Context): AuthenticatedContext => {
  if (!ctx.user) {
    throw new AuthenticationError('Authentication required');
  }
  
  return ctx as AuthenticatedContext;
};