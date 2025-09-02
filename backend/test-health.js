// Simple test to debug health check
const { Client } = require('@elastic/elasticsearch');

// Mock the logger
const logger = {
  info: console.log,
  error: console.error,
  debug: console.log,
};

// Mock config
const config = {
  ELASTICSEARCH_HEALTH_TIMEOUT: 15000,
  ELASTICSEARCH_URL: 'http://burnick.local:9201'
};

// Simplified Elasticsearch connection class
class ElasticsearchConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      const clientConfig = {
        node: config.ELASTICSEARCH_URL,
        requestTimeout: 30000,
        pingTimeout: 10000,
        maxRetries: 3,
      };

      this.client = new Client(clientConfig);
      await this.client.ping();
      this.isConnected = true;

      logger.info('Elasticsearch connection established successfully', {
        node: config.ELASTICSEARCH_URL,
      });

      return this.client;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }
  }

  async ping(timeoutMs = 10000) {
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
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Elasticsearch ping timeout')), timeoutMs);
      });
      
      // Race between ping and timeout
      await Promise.race([
        this.client.ping(),
        timeoutPromise
      ]);
      
      return true;
    } catch (error) {
      logger.error('Elasticsearch ping failed:', error);
      return false;
    }
  }
}

// Test the health check
async function testHealthCheck() {
  console.log('Testing Elasticsearch health check...');
  
  const elasticsearchConnection = new ElasticsearchConnection();
  
  const startTime = Date.now();
  const timeout = config.ELASTICSEARCH_HEALTH_TIMEOUT;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Elasticsearch health check timeout')), timeout);
    });

    const healthPromise = elasticsearchConnection.ping(timeout - 1000);
    const isHealthy = await Promise.race([healthPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;

    console.log('Health check result:', {
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      timeout
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Health check failed:', {
      error: error.message,
      responseTime,
      timeout
    });
  }
}

testHealthCheck().catch(console.error);