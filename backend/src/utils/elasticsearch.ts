import { Client } from '@elastic/elasticsearch';
import { getElasticsearchConfig } from './config';
import { logger } from './logger';

class ElasticsearchConnection {
  private client: Client | null = null;
  private isConnected = false;

  /**
   * Initialize Elasticsearch client
   */
  async connect(): Promise<Client> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      const config = getElasticsearchConfig();
      
      if (!config.url) {
        throw new Error('Elasticsearch URL not configured');
      }

      const clientConfig: any = {
        node: config.url,
        requestTimeout: 30000, // 30 second timeout for requests
        pingTimeout: 10000,    // 10 second timeout for ping
        maxRetries: 3,         // Retry failed requests up to 3 times
        resurrectStrategy: 'ping', // Use ping to check if nodes are alive
      };

      // Add authentication if provided
      if (config.username && config.password) {
        clientConfig.auth = {
          username: config.username,
          password: config.password,
        };
      }

      this.client = new Client(clientConfig);

      // Test the connection with a reasonable timeout
      await this.client.ping();
      this.isConnected = true;

      logger.info('Elasticsearch connection established successfully', {
        node: config.url,
      });

      return this.client;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  /**
   * Get the Elasticsearch client
   */
  getClient(): Client {
    if (!this.client || !this.isConnected) {
      throw new Error('Elasticsearch client not initialized. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Check if Elasticsearch is connected and healthy
   */
  async ping(timeoutMs: number = 5000): Promise<boolean> {
    try {
      if (!this.client) {
        logger.debug('Elasticsearch client not initialized, attempting to connect...');
        try {
          await this.connect();
        } catch (connectError) {
          logger.error('Failed to connect to Elasticsearch for ping:', connectError);
          return false;
        }
      }
      
      // Double-check that client is available after connection attempt
      if (!this.client) {
        logger.error('Elasticsearch client is still null after connection attempt');
        return false;
      }
      
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Elasticsearch ping timeout')), timeoutMs);
      });
      
      // Race between ping and timeout
      await Promise.race([
        this.client.ping(),
        timeoutPromise
      ]);
      
      return true;
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        type: error?.constructor?.name,
        url: this.client ? 'client-available' : 'client-null'
      };
      
      logger.error('Elasticsearch ping failed:', errorInfo);
      return false;
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.isConnected = false;
        logger.info('Elasticsearch connection closed');
      } catch (error) {
        logger.error('Error closing Elasticsearch connection:', error);
      }
    }
  }

  /**
   * Get connection status
   */
  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
export const elasticsearchConnection = new ElasticsearchConnection();