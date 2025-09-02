import { PrismaClient, User } from '@prisma/client';
import { testPrisma, initializeTestDatabase } from './setup';
import bcrypt from 'bcryptjs';

/**
 * Test data factory for creating test users
 */
export class TestDataFactory {
  private static prisma: PrismaClient;

  private static async getPrisma(): Promise<PrismaClient> {
    if (!this.prisma) {
      if (!testPrisma) {
        await initializeTestDatabase();
      }
      this.prisma = testPrisma;
    }
    return this.prisma;
  }

  /**
   * Create a test user with default or custom data
   */
  static async createUser(overrides: Partial<User> = {}): Promise<User> {
    const prisma = await this.getPrisma();
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: await bcrypt.hash('password123', 12),
    };

    return prisma.user.create({
      data: {
        ...defaultUser,
        ...overrides,
      },
    });
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users: User[] = [];
    
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        email: `test-${Date.now()}-${i}@example.com`,
        name: `Test User ${i + 1}`,
        ...overrides,
      });
      users.push(user);
    }

    return users;
  }

  /**
   * Clean all test data
   */
  static async cleanup(): Promise<void> {
    const prisma = await this.getPrisma();
    await prisma.user.deleteMany({});
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that an object matches the expected user structure
   */
  static assertUserStructure(user: any): void {
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
    expect(typeof user.id).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  }

  /**
   * Assert that a user object doesn't contain sensitive fields
   */
  static assertUserSafeStructure(user: any): void {
    this.assertUserStructure(user);
    expect(user).not.toHaveProperty('password');
  }

  /**
   * Assert API response structure
   */
  static assertApiResponse(response: any, expectSuccess: boolean = true): void {
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('timestamp');
    expect(response.success).toBe(expectSuccess);
    expect(typeof response.timestamp).toBe('string');

    if (expectSuccess) {
      expect(response).toHaveProperty('data');
    } else {
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
    }
  }

  /**
   * Assert paginated response structure
   */
  static assertPaginatedResponse(response: any): void {
    expect(response).toHaveProperty('users');
    expect(response).toHaveProperty('total');
    expect(response).toHaveProperty('page');
    expect(response).toHaveProperty('limit');
    expect(response).toHaveProperty('hasNext');
    expect(response).toHaveProperty('hasPrev');
    expect(Array.isArray(response.users)).toBe(true);
    expect(typeof response.total).toBe('number');
    expect(typeof response.page).toBe('number');
    expect(typeof response.limit).toBe('number');
    expect(typeof response.hasNext).toBe('boolean');
    expect(typeof response.hasPrev).toBe('boolean');
  }
}

/**
 * Mock data generators
 */
export class MockDataGenerator {
  /**
   * Generate a valid user data object
   */
  static generateUserData(overrides: any = {}) {
    return {
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Generate registration data
   */
  static generateRegisterData(overrides: any = {}) {
    const password = 'Password123!';
    return {
      email: `user-${Date.now()}@example.com`,
      name: 'Test User',
      password,
      confirmPassword: password,
      ...overrides,
    };
  }

  /**
   * Generate login data
   */
  static generateLoginData(overrides: any = {}) {
    return {
      email: 'test@example.com',
      password: 'Password123!',
      ...overrides,
    };
  }

  /**
   * Generate invalid data for testing validation
   */
  static generateInvalidUserData() {
    return [
      { email: 'invalid-email', name: 'Test User' },
      { email: 'test@example.com', name: '' },
      { email: '', name: 'Test User' },
      { name: 'Test User' }, // missing email
      { email: 'test@example.com' }, // missing name
    ];
  }
}

/**
 * Test environment helpers
 */
export class TestEnvironment {
  /**
   * Check if we're running in test environment
   */
  static isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Get test database URL
   */
  static getTestDatabaseUrl(): string {
    return process.env.DATABASE_URL || '';
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique test identifier
   */
  static generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}