// Global test setup
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout (only set if Jest is available)
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

// Test database instance
let testPrisma: PrismaClient;

// Initialize test database connection
const initializeTestDatabase = async () => {
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connect to test database
  await testPrisma.$connect();
};

// Clean database between tests
const cleanTestDatabase = async () => {
  if (testPrisma) {
    // Clean all tables in reverse order to handle foreign key constraints
    await testPrisma.user.deleteMany({});
  }
};

// Disconnect test database
const disconnectTestDatabase = async () => {
  if (testPrisma) {
    await testPrisma.$disconnect();
  }
};

// Global setup (only set if Jest globals are available)
if (typeof beforeAll !== 'undefined') {
  beforeAll(async () => {
    await initializeTestDatabase();
  });
}

if (typeof afterAll !== 'undefined') {
  afterAll(async () => {
    await disconnectTestDatabase();
  });
}

if (typeof beforeEach !== 'undefined') {
  beforeEach(async () => {
    await cleanTestDatabase();
  });
}

// Initialize database if not in Jest context and if needed
// Only initialize for integration tests or when explicitly requested
const shouldInitializeDatabase = () => {
  const testFile = process.env.JEST_WORKER_ID ? process.argv.find(arg => arg.includes('.test.ts')) : '';
  return testFile && (testFile.includes('integration') || testFile.includes('database'));
};

if (typeof beforeAll === 'undefined' && shouldInitializeDatabase()) {
  initializeTestDatabase().catch(console.error);
}

// Export test database instance and utilities for use in tests
export { 
  testPrisma, 
  initializeTestDatabase, 
  cleanTestDatabase, 
  disconnectTestDatabase 
};