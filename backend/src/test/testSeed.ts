import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { testPrisma, initializeTestDatabase } from './setup';

/**
 * Test database seeding utilities
 */
export class TestSeed {
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
   * Seed the test database with sample data
   */
  static async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test database...');

    try {
      // Clean existing data
      await this.cleanDatabase();

      // Create test users
      await this.createTestUsers();

      console.log('✅ Test database seeded successfully');
    } catch (error) {
      console.error('❌ Error seeding test database:', error);
      throw error;
    }
  }

  /**
   * Clean all data from test database
   */
  static async cleanDatabase(): Promise<void> {
    console.log('🧹 Cleaning test database...');

    const prisma = await this.getPrisma();
    // Delete in reverse order of dependencies
    await prisma.user.deleteMany({});

    console.log('✅ Test database cleaned');
  }

  /**
   * Create test users with various scenarios
   */
  private static async createTestUsers(): Promise<void> {
    console.log('👥 Creating test users...');

    const prisma = await this.getPrisma();
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

    // Create admin user
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Test Admin',
        password: hashedPassword,
      },
    });

    // Create regular users
    const users = [
      {
        email: 'john.doe@test.com',
        name: 'John Doe',
        password: hashedPassword,
      },
      {
        email: 'jane.smith@test.com',
        name: 'Jane Smith',
        password: hashedPassword,
      },
      {
        email: 'bob.wilson@test.com',
        name: 'Bob Wilson',
        password: hashedPassword,
      },
      {
        email: 'alice.johnson@test.com',
        name: 'Alice Johnson',
        password: hashedPassword,
      },
      {
        email: 'charlie.brown@test.com',
        name: 'Charlie Brown',
        password: hashedPassword,
      },
    ];

    for (const userData of users) {
      await prisma.user.create({
        data: userData,
      });
    }

    console.log(`✅ Created ${users.length + 1} test users`);
  }

  /**
   * Create test data for specific test scenarios
   */
  static async createScenarioData(scenario: string): Promise<any> {
    switch (scenario) {
      case 'pagination':
        return this.createPaginationTestData();
      case 'search':
        return this.createSearchTestData();
      case 'sorting':
        return this.createSortingTestData();
      case 'authentication':
        return this.createAuthTestData();
      default:
        throw new Error(`Unknown test scenario: ${scenario}`);
    }
  }

  /**
   * Create data for pagination tests
   */
  private static async createPaginationTestData(): Promise<any> {
    const prisma = await this.getPrisma();
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    const users = [];

    // Create 25 users for pagination testing
    for (let i = 1; i <= 25; i++) {
      const user = await prisma.user.create({
        data: {
          email: `pagination-user-${i.toString().padStart(2, '0')}@test.com`,
          name: `Pagination User ${i}`,
          password: hashedPassword,
        },
      });
      users.push(user);
    }

    return { users, total: 25 };
  }

  /**
   * Create data for search tests
   */
  private static async createSearchTestData(): Promise<any> {
    const prisma = await this.getPrisma();
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

    const searchUsers = [
      {
        email: 'developer.frontend@test.com',
        name: 'Frontend Developer',
        password: hashedPassword,
      },
      {
        email: 'developer.backend@test.com',
        name: 'Backend Developer',
        password: hashedPassword,
      },
      {
        email: 'designer.ui@test.com',
        name: 'UI Designer',
        password: hashedPassword,
      },
      {
        email: 'designer.ux@test.com',
        name: 'UX Designer',
        password: hashedPassword,
      },
      {
        email: 'manager.product@test.com',
        name: 'Product Manager',
        password: hashedPassword,
      },
    ];

    const createdUsers = [];
    for (const userData of searchUsers) {
      const user = await prisma.user.create({
        data: userData,
      });
      createdUsers.push(user);
    }

    return { users: createdUsers };
  }

  /**
   * Create data for sorting tests
   */
  private static async createSortingTestData(): Promise<any> {
    const prisma = await this.getPrisma();
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

    // Create users with specific names for sorting
    const sortUsers = [
      { email: 'zebra@test.com', name: 'Zebra User' },
      { email: 'alpha@test.com', name: 'Alpha User' },
      { email: 'beta@test.com', name: 'Beta User' },
      { email: 'gamma@test.com', name: 'Gamma User' },
    ];

    const createdUsers = [];
    for (const userData of sortUsers) {
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });
      createdUsers.push(user);
    }

    return { users: createdUsers };
  }

  /**
   * Create data for authentication tests
   */
  private static async createAuthTestData(): Promise<any> {
    const prisma = await this.getPrisma();
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);

    const authUser = await prisma.user.create({
      data: {
        email: 'auth.test@test.com',
        name: 'Auth Test User',
        password: hashedPassword,
      },
    });

    return { 
      user: authUser, 
      plainPassword: 'TestPassword123!' 
    };
  }

  /**
   * Get test user by email
   */
  static async getTestUser(email: string) {
    const prisma = await this.getPrisma();
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Get all test users
   */
  static async getAllTestUsers() {
    const prisma = await this.getPrisma();
    return prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Count test users
   */
  static async countTestUsers(): Promise<number> {
    const prisma = await this.getPrisma();
    return prisma.user.count();
  }

  /**
   * Reset test database to initial state
   */
  static async resetToInitialState(): Promise<void> {
    await this.cleanDatabase();
    await this.seedTestData();
  }
}

// Export for use in test files
export default TestSeed;