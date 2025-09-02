import { randomBytes } from 'crypto';
import { logger } from './logger';
import { OAuthState } from '../types/oauth';

/**
 * In-memory OAuth state store with automatic cleanup
 * In production, this should be replaced with Redis or another persistent store
 */
export class OAuthStateStore {
  private states = new Map<string, OAuthState>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate a secure state parameter
   */
  generateState(provider: string, redirectUrl?: string): string {
    const nonce = randomBytes(32).toString('hex');
    const stateKey = randomBytes(16).toString('hex');
    
    const state: OAuthState = {
      provider,
      redirectUrl,
      timestamp: Date.now(),
      nonce
    };
    
    this.states.set(stateKey, state);
    
    logger.debug('OAuth state generated', {
      stateKey,
      provider,
      hasRedirectUrl: !!redirectUrl
    });
    
    return stateKey;
  }

  /**
   * Validate and retrieve state information
   */
  validateState(stateKey: string): OAuthState | null {
    const state = this.states.get(stateKey);
    
    if (!state) {
      logger.warn('OAuth state not found', { stateKey });
      return null;
    }
    
    // Check if state has expired
    const now = Date.now();
    const age = now - state.timestamp;
    
    if (age > this.STATE_TTL_MS) {
      logger.warn('OAuth state expired', {
        stateKey,
        age: Math.round(age / 1000),
        maxAge: Math.round(this.STATE_TTL_MS / 1000)
      });
      this.states.delete(stateKey);
      return null;
    }
    
    // Remove state after successful validation (one-time use)
    this.states.delete(stateKey);
    
    logger.debug('OAuth state validated and consumed', {
      stateKey,
      provider: state.provider
    });
    
    return state;
  }

  /**
   * Get current state count (for monitoring)
   */
  getStateCount(): number {
    return this.states.size;
  }

  /**
   * Clear all states (for testing)
   */
  clearAll(): void {
    const count = this.states.size;
    this.states.clear();
    logger.debug('All OAuth states cleared', { count });
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      return;
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredStates();
    }, this.CLEANUP_INTERVAL_MS);
    
    logger.debug('OAuth state cleanup timer started', {
      intervalMs: this.CLEANUP_INTERVAL_MS
    });
  }

  /**
   * Stop automatic cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.debug('OAuth state cleanup timer stopped');
    }
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [stateKey, state] of this.states.entries()) {
      const age = now - state.timestamp;
      
      if (age > this.STATE_TTL_MS) {
        this.states.delete(stateKey);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired OAuth states', {
        cleanedCount,
        remainingCount: this.states.size
      });
    }
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    this.stopCleanupTimer();
    this.clearAll();
    logger.info('OAuth state store shutdown complete');
  }
}

// Export singleton instance
export const oauthStateStore = new OAuthStateStore();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  oauthStateStore.shutdown();
});

process.on('SIGINT', () => {
  oauthStateStore.shutdown();
});