import { execSync } from 'child_process';
import dotenv from 'dotenv';

/**
 * Global test setup - runs once before all tests
 */
export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting global test setup...');

  try {
    // Load test environment variables
    dotenv.config({ path: '.env.test' });

    // Ensure we're in test environment
    process.env.NODE_ENV = 'test';

    // Verify test database URL is different from development
    const testDbUrl = process.env.DATABASE_URL;
    if (!testDbUrl || !testDbUrl.includes('test')) {
      throw new Error('Test database URL must contain "test" to prevent accidental data loss');
    }

    console.log('📋 Test environment variables loaded');

    // Run database migrations for test database
    console.log('🗄️  Setting up test database...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl,
      },
    });

    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', {
      stdio: 'inherit',
    });

    console.log('✅ Global test setup completed');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
}