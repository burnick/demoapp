#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { TestSeed } from './testSeed';
import { TestEnvironment } from './testUtils';

/**
 * Comprehensive test runner for the backend API
 */
class TestRunner {
  private static readonly TEST_COMMANDS = {
    unit: 'jest --testPathPattern="(utils|services|controllers)\\.test\\.ts$"',
    integration: 'jest --testPathPattern="integration\\.test\\.ts$"',
    trpc: 'jest --testPathPattern="trpc.*\\.test\\.ts$"',
    all: 'jest',
    coverage: 'jest --coverage',
    watch: 'jest --watch',
  };

  /**
   * Run specific test suite
   */
  static async runTests(suite: keyof typeof TestRunner.TEST_COMMANDS = 'all'): Promise<void> {
    console.log(`🧪 Running ${suite} tests...`);

    try {
      // Ensure we're in test environment
      if (!TestEnvironment.isTestEnvironment()) {
        console.log('⚠️  Setting NODE_ENV to test');
        process.env.NODE_ENV = 'test';
      }

      // Setup test database
      await this.setupTestDatabase();

      // Run tests
      const command = this.TEST_COMMANDS[suite];
      console.log(`📋 Executing: ${command}`);
      
      execSync(command, {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      console.log(`✅ ${suite} tests completed successfully`);
    } catch (error) {
      console.error(`❌ ${suite} tests failed:`, error);
      process.exit(1);
    }
  }

  /**
   * Setup test database
   */
  private static async setupTestDatabase(): Promise<void> {
    console.log('🗄️  Setting up test database...');

    try {
      // Run database migrations for test database
      console.log('📦 Running database migrations...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: TestEnvironment.getTestDatabaseUrl(),
        },
      });

      // Generate Prisma client
      console.log('🔧 Generating Prisma client...');
      execSync('npx prisma generate', {
        stdio: 'inherit',
      });

      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  /**
   * Clean test database
   */
  static async cleanTestDatabase(): Promise<void> {
    console.log('🧹 Cleaning test database...');

    try {
      await TestSeed.cleanDatabase();
      console.log('✅ Test database cleaned');
    } catch (error) {
      console.error('❌ Failed to clean test database:', error);
      throw error;
    }
  }

  /**
   * Seed test database
   */
  static async seedTestDatabase(): Promise<void> {
    console.log('🌱 Seeding test database...');

    try {
      await TestSeed.seedTestData();
      console.log('✅ Test database seeded');
    } catch (error) {
      console.error('❌ Failed to seed test database:', error);
      throw error;
    }
  }

  /**
   * Reset test database
   */
  static async resetTestDatabase(): Promise<void> {
    console.log('🔄 Resetting test database...');

    try {
      await TestSeed.resetToInitialState();
      console.log('✅ Test database reset');
    } catch (error) {
      console.error('❌ Failed to reset test database:', error);
      throw error;
    }
  }

  /**
   * Run tests with coverage report
   */
  static async runWithCoverage(): Promise<void> {
    await this.runTests('coverage');
  }

  /**
   * Run tests in watch mode
   */
  static async runInWatchMode(): Promise<void> {
    await this.runTests('watch');
  }

  /**
   * Run pre-commit tests (fast subset)
   */
  static async runPreCommitTests(): Promise<void> {
    console.log('🚀 Running pre-commit tests...');

    try {
      // Run unit tests only for speed
      await this.runTests('unit');
      
      // Run linting
      console.log('🔍 Running linter...');
      execSync('npm run lint', { stdio: 'inherit' });

      // Run type checking
      console.log('🔧 Running type check...');
      execSync('npm run type-check', { stdio: 'inherit' });

      console.log('✅ Pre-commit tests passed');
    } catch (error) {
      console.error('❌ Pre-commit tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Run CI tests (comprehensive)
   */
  static async runCITests(): Promise<void> {
    console.log('🏗️  Running CI tests...');

    try {
      // Run all tests with coverage
      await this.runWithCoverage();

      // Run linting
      console.log('🔍 Running linter...');
      execSync('npm run lint', { stdio: 'inherit' });

      // Run type checking
      console.log('🔧 Running type check...');
      execSync('npm run type-check', { stdio: 'inherit' });

      // Build project
      console.log('📦 Building project...');
      execSync('npm run build', { stdio: 'inherit' });

      console.log('✅ CI tests passed');
    } catch (error) {
      console.error('❌ CI tests failed:', error);
      process.exit(1);
    }
  }

  /**
   * Generate test report
   */
  static async generateTestReport(): Promise<void> {
    console.log('📊 Generating test report...');

    try {
      // Run tests with coverage and generate reports
      execSync('jest --coverage --coverageReporters=text --coverageReporters=lcov --coverageReporters=html', {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      console.log('✅ Test report generated');
      console.log('📁 Coverage report available in ./coverage/lcov-report/index.html');
    } catch (error) {
      console.error('❌ Failed to generate test report:', error);
      throw error;
    }
  }

  /**
   * Validate test environment
   */
  static validateTestEnvironment(): boolean {
    console.log('🔍 Validating test environment...');

    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      return false;
    }

    if (!TestEnvironment.isTestEnvironment()) {
      console.error('❌ NODE_ENV must be set to "test"');
      return false;
    }

    console.log('✅ Test environment is valid');
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      // Validate environment first
      if (!TestRunner.validateTestEnvironment()) {
        process.exit(1);
      }

      switch (command) {
        case 'unit':
          await TestRunner.runTests('unit');
          break;
        case 'integration':
          await TestRunner.runTests('integration');
          break;
        case 'trpc':
          await TestRunner.runTests('trpc');
          break;
        case 'coverage':
          await TestRunner.runWithCoverage();
          break;
        case 'watch':
          await TestRunner.runInWatchMode();
          break;
        case 'pre-commit':
          await TestRunner.runPreCommitTests();
          break;
        case 'ci':
          await TestRunner.runCITests();
          break;
        case 'report':
          await TestRunner.generateTestReport();
          break;
        case 'clean':
          await TestRunner.cleanTestDatabase();
          break;
        case 'seed':
          await TestRunner.seedTestDatabase();
          break;
        case 'reset':
          await TestRunner.resetTestDatabase();
          break;
        case 'all':
        default:
          await TestRunner.runTests('all');
          break;
      }
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  })();
}

export { TestRunner };