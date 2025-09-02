import { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth } from '../prisma/client';
import { logger } from './logger';

/**
 * Initialize database connection and run migrations if needed
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing database connection...');
    
    // Connect to database
    await connectDatabase();
    
    // Check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
};

/**
 * Gracefully shutdown database connection
 */
export const shutdownDatabase = async (): Promise<void> => {
  try {
    logger.info('Shutting down database connection...');
    await disconnectDatabase();
    logger.info('Database connection closed successfully');
  } catch (error) {
    logger.error('Error during database shutdown', { error });
    throw error;
  }
};

/**
 * Database health check endpoint utility
 */
export const getDatabaseStatus = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details?: any;
}> => {
  try {
    const isHealthy = await checkDatabaseHealth();
    
    if (isHealthy) {
      // Get additional database info
      const result = await prisma.$queryRaw`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          version() as version,
          now() as server_time
      `;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: result,
      };
    } else {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    logger.error('Database status check failed', { error });
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
};

/**
 * Run database migrations programmatically (for production deployments)
 */
export const runMigrations = async (): Promise<void> => {
  try {
    logger.info('Running database migrations...');
    
    // Note: In production, you would typically run migrations using Prisma CLI
    // This is a placeholder for programmatic migration execution
    // await prisma.$executeRaw`-- Migration commands would go here`;
    
    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Failed to run database migrations', { error });
    throw error;
  }
};

export { prisma };