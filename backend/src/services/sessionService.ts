import { cacheService } from './cacheService';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
  lastAccessedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any; // Allow additional session data
}

export interface SessionOptions {
  ttl?: number; // Session TTL in seconds (default: 24 hours)
  renewOnAccess?: boolean; // Renew session TTL on access (default: true)
}

class SessionService {
  private readonly SESSION_PREFIX = 'session';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    sessionData: Omit<SessionData, 'userId' | 'createdAt' | 'lastAccessedAt'>,
    options: SessionOptions = {}
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const ttl = options.ttl || this.DEFAULT_TTL;
      
      const session: SessionData = {
        userId,
        email: sessionData.email,
        name: sessionData.name,
        ...sessionData,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };

      // Store session data
      const sessionStored = await cacheService.set(
        sessionId,
        session,
        { prefix: this.SESSION_PREFIX, ttl }
      );

      if (!sessionStored) {
        throw new Error('Failed to store session data');
      }

      // Add session to user's session list
      await this.addSessionToUser(userId, sessionId, ttl);

      logger.info(`Session created for user ${userId}: ${sessionId}`);
      return sessionId;
    } catch (error) {
      logger.error(`Failed to create session for user ${userId}:`, error);
      throw new Error('Session creation failed');
    }
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string, options: SessionOptions = {}): Promise<SessionData | null> {
    try {
      const session = await cacheService.get<SessionData>(
        sessionId,
        { prefix: this.SESSION_PREFIX }
      );

      if (!session) {
        return null;
      }

      // Update last accessed time and renew TTL if enabled
      if (options.renewOnAccess !== false) {
        session.lastAccessedAt = new Date();
        
        const ttl = options.ttl || this.DEFAULT_TTL;
        await cacheService.set(
          sessionId,
          session,
          { prefix: this.SESSION_PREFIX, ttl }
        );

        // Also renew the session in user's session list
        await this.renewUserSession(session.userId, sessionId, ttl);
      }

      return session;
    } catch (error) {
      logger.error(`Failed to get session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<SessionData, 'userId' | 'createdAt'>>,
    options: SessionOptions = {}
  ): Promise<boolean> {
    try {
      const existingSession = await cacheService.get<SessionData>(
        sessionId,
        { prefix: this.SESSION_PREFIX }
      );

      if (!existingSession) {
        return false;
      }

      const updatedSession: SessionData = {
        ...existingSession,
        ...updates,
        lastAccessedAt: new Date(),
      };

      const ttl = options.ttl || this.DEFAULT_TTL;
      const updated = await cacheService.set(
        sessionId,
        updatedSession,
        { prefix: this.SESSION_PREFIX, ttl }
      );

      if (updated) {
        logger.info(`Session updated: ${sessionId}`);
      }

      return updated;
    } catch (error) {
      logger.error(`Failed to update session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Get session to find user ID
      const session = await cacheService.get<SessionData>(
        sessionId,
        { prefix: this.SESSION_PREFIX }
      );

      // Delete session data
      const deleted = await cacheService.delete(
        sessionId,
        { prefix: this.SESSION_PREFIX }
      );

      // Remove session from user's session list
      if (session) {
        await this.removeSessionFromUser(session.userId, sessionId);
      }

      if (deleted) {
        logger.info(`Session deleted: ${sessionId}`);
      }

      return deleted;
    } catch (error) {
      logger.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const sessions = await cacheService.get<string[]>(
        userId,
        { prefix: this.USER_SESSIONS_PREFIX }
      );

      // Ensure we always return an array
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      logger.error(`Failed to get sessions for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const sessionIds = await this.getUserSessions(userId);
      
      if (sessionIds.length === 0) {
        return 0;
      }

      // Delete all session data
      const deletedCount = await cacheService.mdel(
        sessionIds,
        { prefix: this.SESSION_PREFIX }
      );

      // Clear user's session list
      await cacheService.delete(
        userId,
        { prefix: this.USER_SESSIONS_PREFIX }
      );

      logger.info(`Deleted ${deletedCount} sessions for user ${userId}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Failed to delete sessions for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Check if a session exists and is valid
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    try {
      const exists = await cacheService.exists(
        sessionId,
        { prefix: this.SESSION_PREFIX }
      );
      return exists;
    } catch (error) {
      logger.error(`Failed to validate session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string, ttl: number): Promise<boolean> {
    try {
      const extended = await cacheService.expire(
        sessionId,
        ttl,
        { prefix: this.SESSION_PREFIX }
      );

      if (extended) {
        // Also extend in user's session list
        const session = await cacheService.get<SessionData>(
          sessionId,
          { prefix: this.SESSION_PREFIX }
        );
        
        if (session) {
          await this.renewUserSession(session.userId, sessionId, ttl);
        }

        logger.info(`Session extended: ${sessionId} (TTL: ${ttl}s)`);
      }

      return extended;
    } catch (error) {
      logger.error(`Failed to extend session ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Clean up expired sessions for a user
   */
  async cleanupUserSessions(userId: string): Promise<number> {
    try {
      const sessionIds = await this.getUserSessions(userId);
      const validSessions: string[] = [];
      let cleanedCount = 0;

      // Check each session and keep only valid ones
      for (const sessionId of sessionIds) {
        const isValid = await this.isValidSession(sessionId);
        if (isValid) {
          validSessions.push(sessionId);
        } else {
          cleanedCount++;
        }
      }

      // Update user's session list with only valid sessions
      if (cleanedCount > 0) {
        if (validSessions.length > 0) {
          await cacheService.set(
            userId,
            validSessions,
            { prefix: this.USER_SESSIONS_PREFIX }
          );
        } else {
          await cacheService.delete(
            userId,
            { prefix: this.USER_SESSIONS_PREFIX }
          );
        }

        logger.info(`Cleaned up ${cleanedCount} expired sessions for user ${userId}`);
      }

      return cleanedCount;
    } catch (error) {
      logger.error(`Failed to cleanup sessions for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    totalUsers: number;
  }> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to use Redis SCAN for better performance
      const sessionKeys = await cacheService.get<string[]>('*', { prefix: this.SESSION_PREFIX }) || [];
      const userKeys = await cacheService.get<string[]>('*', { prefix: this.USER_SESSIONS_PREFIX }) || [];

      return {
        totalSessions: sessionKeys.length,
        totalUsers: userKeys.length,
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      return {
        totalSessions: 0,
        totalUsers: 0,
      };
    }
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Add session to user's session list
   */
  private async addSessionToUser(userId: string, sessionId: string, ttl: number): Promise<void> {
    try {
      const existingSessions = await this.getUserSessions(userId);
      const updatedSessions = [...existingSessions, sessionId];

      await cacheService.set(
        userId,
        updatedSessions,
        { prefix: this.USER_SESSIONS_PREFIX, ttl }
      );
    } catch (error) {
      logger.error(`Failed to add session to user ${userId}:`, error);
    }
  }

  /**
   * Remove session from user's session list
   */
  private async removeSessionFromUser(userId: string, sessionId: string): Promise<void> {
    try {
      const existingSessions = await this.getUserSessions(userId);
      const updatedSessions = existingSessions.filter(id => id !== sessionId);

      if (updatedSessions.length > 0) {
        await cacheService.set(
          userId,
          updatedSessions,
          { prefix: this.USER_SESSIONS_PREFIX }
        );
      } else {
        await cacheService.delete(
          userId,
          { prefix: this.USER_SESSIONS_PREFIX }
        );
      }
    } catch (error) {
      logger.error(`Failed to remove session from user ${userId}:`, error);
    }
  }

  /**
   * Renew session in user's session list
   */
  private async renewUserSession(userId: string, sessionId: string, ttl: number): Promise<void> {
    try {
      const existingSessions = await this.getUserSessions(userId);
      
      if (existingSessions.includes(sessionId)) {
        await cacheService.expire(
          userId,
          ttl,
          { prefix: this.USER_SESSIONS_PREFIX }
        );
      }
    } catch (error) {
      logger.error(`Failed to renew session for user ${userId}:`, error);
    }
  }
}

// Create singleton instance
export const sessionService = new SessionService();