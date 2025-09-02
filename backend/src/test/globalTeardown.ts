/**
 * Global test teardown - runs once after all tests
 */
export default async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting global test teardown...');

  try {
    // Clean up any global resources
    // Note: Individual test cleanup is handled in setup.ts

    console.log('✅ Global test teardown completed');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}