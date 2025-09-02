import { createClient, RedisClientType } from 'redis';
import { getRedisConfig } from './config';
import { logger } from './logger';

class RedisConnection {
  private client: RedisClientType | null = null;
  private isConnected = false;

  async connect(): Promise<RedisClientType> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      const redisConfig = getRedisConfig();
      
      // Create Redis client with configuration
      this.client = createClient({
        url: redisConfig.url,
        socket: {
          host: redisConfig.host,
          port: redisConfig.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis connection failed after 10 retries');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: redisConfig.password,
      });

      // Set up event listeners
      this.client.on('error', (error) => {
        logger.error('Redis client error:', error);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();
      
      logger.info('Redis connection established successfully');
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw new Error(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('Redis connection closed');
      } catch (error) {
        logger.error('Error disconnecting from Redis:', error);
      }
    }
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.client || !this.isConnected) {
        return false;
      }
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const redisConnection = new RedisConnection();

export { redisConnection };
export type { RedisClientType };