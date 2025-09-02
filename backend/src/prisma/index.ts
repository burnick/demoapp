// Export Prisma client and utilities
export { 
  prisma, 
  connectDatabase, 
  disconnectDatabase, 
  checkDatabaseHealth, 
  withTransaction 
} from './client';

// Export database utilities
export { 
  initializeDatabase, 
  shutdownDatabase, 
  getDatabaseStatus, 
  runMigrations 
} from '../utils/database';

// Re-export Prisma types for convenience
export type { PrismaClient } from '@prisma/client';
export type { User } from '@prisma/client';