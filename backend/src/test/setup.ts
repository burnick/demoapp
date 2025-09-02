// Global test setup
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Test database instance
let testPrisma: PrismaClient;

// Global setup
beforeAll(async () => {
  // Initialize test database connection
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connect to test database
  await testPrisma.$connect();
});

// Global teardown
afterAll(async () => {
  // Clean up test database
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
});

// Clean database between tests
beforeEach(async () => {
  if (testPrisma) {
    // Clean all tables in reverse order to handle foreign key constraints
    await testPrisma.user.deleteMany({});
  }
});

// Export test database instance for use in tests
export { testPrisma };