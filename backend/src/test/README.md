# Comprehensive Test Suite

This directory contains a comprehensive test suite for the backend API system, implementing all the requirements from task 12.

## Overview

The test suite provides complete coverage for:
- ✅ **Unit Tests** - Testing utilities, services, and controllers in isolation
- ✅ **Integration Tests** - End-to-end API testing with supertest
- ✅ **Database Tests** - Prisma test database configuration and seeding
- ✅ **TypeScript Support** - Full Jest configuration with TypeScript

## Test Structure

```
src/test/
├── setup.ts                    # Global test setup with database
├── setupUnit.ts                # Unit test setup (no database)
├── globalSetup.ts              # Jest global setup
├── globalTeardown.ts           # Jest global teardown
├── testResultsProcessor.ts     # Custom test results processor
├── testUtils.ts                # Test utilities and helpers
├── testSeed.ts                 # Database seeding utilities
├── testRunner.ts               # Comprehensive test runner
├── testDemo.ts                 # Test suite demonstration
├── README.md                   # This file
│
├── utils.test.ts               # Unit tests for utilities
├── services.test.ts            # Unit tests for services
├── controllers.test.ts         # Unit tests for controllers
├── integration.test.ts         # Integration tests for API endpoints
├── trpc-integration.test.ts    # tRPC integration tests
├── schemas.test.ts             # Schema validation tests
├── cache.test.ts               # Cache functionality tests
├── search.test.ts              # Search functionality tests
├── openapi.test.ts             # OpenAPI generation tests
└── ...                         # Additional test files
```

## Test Categories

### 1. Unit Tests
- **Utilities** (`utils.test.ts`) - Configuration, logging, error handling, helpers
- **Services** (`services.test.ts`) - Business logic, database operations
- **Controllers** (`controllers.test.ts`) - Request handling, response formatting
- **Schemas** (`schemas.test.ts`) - Zod validation schemas

### 2. Integration Tests
- **API Endpoints** (`integration.test.ts`) - Full HTTP request/response testing
- **tRPC Integration** (`trpc-integration.test.ts`) - Type-safe procedure testing
- **Authentication Flow** - Login, registration, token refresh
- **CRUD Operations** - Create, read, update, delete operations
- **Error Handling** - Error responses and edge cases

### 3. Database Tests
- **Prisma Operations** - Database queries and mutations
- **Data Seeding** - Test data creation and cleanup
- **Transactions** - Database transaction testing
- **Migrations** - Schema migration testing

## Test Utilities

### TestDataFactory
Creates test data with realistic values:
```typescript
// Create a single test user
const user = await TestDataFactory.createUser();

// Create multiple test users
const users = await TestDataFactory.createUsers(5);

// Create user with custom data
const admin = await TestDataFactory.createUser({
  email: 'admin@test.com',
  name: 'Admin User'
});
```

### TestAssertions
Provides common assertion helpers:
```typescript
// Assert user structure
TestAssertions.assertUserStructure(user);

// Assert API response format
TestAssertions.assertApiResponse(response);

// Assert paginated response
TestAssertions.assertPaginatedResponse(paginatedData);
```

### MockDataGenerator
Generates mock data for testing:
```typescript
// Generate user data
const userData = MockDataGenerator.generateUserData();

// Generate registration data
const registerData = MockDataGenerator.generateRegisterData();

// Generate invalid data for validation testing
const invalidData = MockDataGenerator.generateInvalidUserData();
```

### TestSeed
Database seeding utilities:
```typescript
// Seed test database
await TestSeed.seedTestData();

// Clean test database
await TestSeed.cleanDatabase();

// Create scenario-specific data
await TestSeed.createScenarioData('pagination');
```

## Running Tests

### Basic Commands
```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage report
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Advanced Commands
```bash
# Run CI tests (comprehensive)
npm run test:ci

# Run pre-commit tests (fast)
npm run test:pre-commit

# Generate detailed test report
npm run test:report

# Clean test database
npm run test:clean

# Seed test database
npm run test:seed

# Reset test database
npm run test:reset
```

### Jest Projects
The test suite uses Jest projects for different test types:

```bash
# Run specific project
npx jest --selectProjects unit
npx jest --selectProjects integration

# Run specific test file
npx jest utils.test.ts
npx jest integration.test.ts
```

## Configuration

### Environment Variables
Test environment uses `.env.test`:
```env
NODE_ENV=test
DATABASE_URL="postgresql://user:pass@localhost:5432/demoapp_test"
JWT_SECRET="test-secret"
# ... other test-specific variables
```

### Jest Configuration
- **TypeScript Support** - Full ts-jest integration
- **Coverage Thresholds** - Enforced coverage requirements
- **Custom Matchers** - Extended Jest matchers
- **Parallel Testing** - Optimized test execution

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: { branches: 70, functions: 70, lines: 70, statements: 70 },
  './src/services/': { branches: 80, functions: 80, lines: 80, statements: 80 },
  './src/controllers/': { branches: 75, functions: 75, lines: 75, statements: 75 },
  './src/utils/': { branches: 85, functions: 85, lines: 85, statements: 85 },
}
```

## Test Database Setup

### Prerequisites
1. PostgreSQL test database running
2. Test database URL configured in `.env.test`
3. Prisma migrations applied

### Automatic Setup
The test runner automatically:
1. Runs database migrations
2. Generates Prisma client
3. Seeds test data
4. Cleans up after tests

### Manual Setup
```bash
# Setup test database
npm run test:reset

# Run migrations
npx prisma migrate deploy

# Seed test data
npm run test:seed
```

## Best Practices

### Writing Tests
1. **Isolation** - Each test should be independent
2. **Cleanup** - Clean up test data after each test
3. **Mocking** - Mock external dependencies
4. **Assertions** - Use descriptive assertions
5. **Coverage** - Aim for high test coverage

### Test Organization
1. **Descriptive Names** - Use clear test descriptions
2. **Grouping** - Group related tests with `describe`
3. **Setup/Teardown** - Use `beforeEach`/`afterEach` for setup
4. **Data Factories** - Use factories for test data creation

### Performance
1. **Parallel Execution** - Tests run in parallel by default
2. **Database Cleanup** - Efficient cleanup strategies
3. **Mocking** - Mock expensive operations
4. **Selective Testing** - Run only relevant tests during development

## Continuous Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: npm run test:ci
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
```

### Pre-commit Hooks
```bash
# Fast tests for pre-commit
npm run test:pre-commit
```

### Coverage Reports
- **HTML Report** - `coverage/lcov-report/index.html`
- **LCOV Format** - `coverage/lcov.info`
- **JSON Format** - `coverage/coverage-final.json`

## Troubleshooting

### Common Issues

1. **Database Connection**
   ```bash
   # Check database is running
   npm run test:clean
   ```

2. **TypeScript Errors**
   ```bash
   # Regenerate Prisma client
   npx prisma generate
   ```

3. **Test Timeouts**
   ```bash
   # Increase timeout in jest.config.js
   testTimeout: 30000
   ```

4. **Memory Issues**
   ```bash
   # Reduce parallel workers
   maxWorkers: 2
   ```

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm run test

# Run specific test with verbose output
npx jest --verbose utils.test.ts
```

## Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Use existing utilities and patterns
3. Follow naming conventions
4. Add to appropriate Jest project
5. Update coverage thresholds if needed

### Test File Template
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { TestDataFactory, TestAssertions } from './testUtils';

describe('Feature Name', () => {
  beforeEach(async () => {
    await TestDataFactory.cleanup();
  });

  describe('Method Name', () => {
    it('should do something successfully', async () => {
      // Arrange
      const testData = await TestDataFactory.createUser();

      // Act
      const result = await someFunction(testData);

      // Assert
      expect(result).toBeDefined();
      TestAssertions.assertUserStructure(result);
    });
  });
});
```

## Requirements Compliance

This test suite fulfills all requirements from task 12:

✅ **Set up Jest testing environment with TypeScript support**
- Complete Jest configuration with ts-jest
- TypeScript compilation and type checking
- Custom Jest projects for different test types

✅ **Write unit tests for utilities, services, and controllers**
- Comprehensive unit tests for all utility functions
- Service layer testing with mocked dependencies
- Controller testing with request/response validation

✅ **Create integration tests for API endpoints using supertest**
- Full HTTP request/response testing
- Authentication flow testing
- CRUD operation testing
- Error handling and edge cases

✅ **Add Prisma test database configuration and test data seeding**
- Separate test database configuration
- Automated database setup and cleanup
- Comprehensive test data seeding utilities
- Database transaction testing

The test suite provides a robust foundation for maintaining code quality and ensuring reliable API functionality.