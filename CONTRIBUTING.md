# Contributing Guidelines

Thank you for your interest in contributing to the Backend API project! This document provides comprehensive guidelines for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [API Development](#api-development)
- [Database Changes](#database-changes)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code Review Process](#code-review-process)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker Engine 20.10+
- Docker Compose V2
- Git
- A code editor with TypeScript support (VS Code recommended)

### Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/your-username/backend-api-project.git
   cd backend-api-project
   ```

2. **Set up the development environment**:
   ```bash
   # Quick setup (recommended)
   npm run setup
   
   # Or manual setup
   npm run validate
   npm run dev
   ```

3. **Verify the setup**:
   ```bash
   # Check if all services are running
   npm run dev:logs
   
   # Test the API
   curl http://localhost:3000/api/health
   ```

4. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

## Development Workflow

### Branch Strategy

We use a feature branch workflow:

1. **Create a feature branch** from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines below

3. **Test your changes** thoroughly:
   ```bash
   npm run backend:test
   npm run validate
   ```

4. **Commit your changes** using conventional commits:
   ```bash
   git add .
   git commit -m "feat: add user preference management"
   ```

5. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Conventional Commits

We use conventional commit messages for automated changelog generation:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
feat: add multi-factor authentication support
fix: resolve user search pagination issue
docs: update API documentation for v2 endpoints
test: add integration tests for auth endpoints
refactor: improve error handling in user service
```

## Code Standards

### TypeScript Guidelines

- **Strict Mode**: All TypeScript code must compile with strict mode enabled
- **Type Safety**: Avoid `any` types; use proper typing
- **Interfaces**: Define interfaces for all data structures
- **Generics**: Use generics for reusable components

**Example:**
```typescript
// Good
interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
}

// Bad
const preferences: any = {
  theme: 'light',
  // ...
};
```

### Code Formatting

- **ESLint**: All code must pass ESLint checks
- **Prettier**: Code formatting is handled by Prettier (configured in ESLint)
- **Import Order**: Use consistent import ordering

**Run formatting:**
```bash
cd backend
npm run lint:fix
```

### Naming Conventions

- **Files**: Use camelCase for files (`userService.ts`)
- **Classes**: Use PascalCase (`UserController`)
- **Functions**: Use camelCase (`getUserById`)
- **Constants**: Use UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Interfaces**: Use PascalCase with descriptive names (`UserCreateInput`)

### Error Handling

- **Custom Errors**: Use custom error classes
- **Error Codes**: Include error codes for API responses
- **Logging**: Log errors with appropriate context

**Example:**
```typescript
import { ApiError } from '../utils/errors';

// Good
if (!user) {
  throw new ApiError('USER_NOT_FOUND', 'User not found', 404);
}

// Bad
if (!user) {
  throw new Error('User not found');
}
```

## Testing Guidelines

### Test Categories

1. **Unit Tests**: Test individual functions and services
2. **Integration Tests**: Test API endpoints end-to-end
3. **tRPC Tests**: Test tRPC procedures and type safety

### Writing Tests

- **Test Structure**: Use Arrange-Act-Assert pattern
- **Descriptive Names**: Use clear, descriptive test names
- **Test Data**: Use factories or fixtures for test data
- **Cleanup**: Ensure tests clean up after themselves

**Example:**
```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when valid ID is provided', async () => {
      // Arrange
      const userId = 'test-user-id';
      const expectedUser = { id: userId, name: 'Test User' };
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toEqual(expectedUser);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const invalidId = 'invalid-id';
      
      // Act & Assert
      await expect(userService.getUserById(invalidId))
        .rejects.toThrow('User not found');
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm run backend:test

# Run specific test categories
cd backend
npm run test:unit
npm run test:integration
npm run test:trpc

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Coverage

- Maintain **minimum 80% test coverage**
- Focus on **critical business logic**
- Include **error scenarios** in tests
- Test **edge cases** and **boundary conditions**

## API Development

### tRPC Procedures

When adding new tRPC procedures:

1. **Define Zod schemas** for input and output validation
2. **Add OpenAPI metadata** for documentation
3. **Implement proper error handling**
4. **Add comprehensive tests**

**Example:**
```typescript
import { z } from 'zod';
import { createOpenApiMeta } from '../utils/openapi';

const getUserSchema = z.object({
  id: z.string().uuid(),
});

const userRouter = trpcRouter({
  getUser: baseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/users/{id}',
      summary: 'Get user by ID',
      description: 'Retrieve a specific user by their unique identifier',
      tags: ['Users'],
      protect: true,
    }))
    .input(getUserSchema)
    .output(ApiResponseSchema(UserSchema))
    .query(async ({ input, ctx }) => {
      const controller = new UserController();
      return controller.getUserById(input.id, ctx.user?.id);
    }),
});
```

### API Versioning

When adding new API versions:

1. **Create new version directory** (`src/routes/v3/`)
2. **Implement enhanced features** while maintaining backward compatibility
3. **Update version registry** in middleware
4. **Add deprecation warnings** for older versions
5. **Update documentation** with migration guides

### Schema Design

- **Validation**: Use Zod for all input/output validation
- **Composition**: Create reusable schema components
- **Documentation**: Add descriptions to schema fields
- **Versioning**: Version schemas when making breaking changes

**Example:**
```typescript
const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark']).describe('UI theme preference'),
  language: z.string().min(2).max(5).describe('Language code (ISO 639-1)'),
  notifications: z.object({
    email: z.boolean().describe('Email notifications enabled'),
    push: z.boolean().describe('Push notifications enabled'),
  }),
});

const EnhancedUserSchema = UserSchema.extend({
  preferences: UserPreferencesSchema.optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).default([]),
});
```

## Database Changes

### Prisma Migrations

When making database changes:

1. **Update the schema** in `prisma/schema.prisma`
2. **Generate migration** with descriptive name:
   ```bash
   cd backend
   npx prisma migrate dev --name add_user_preferences
   ```
3. **Update seed data** if necessary
4. **Test migration** on clean database
5. **Update related types** and services

### Migration Guidelines

- **Backward Compatibility**: Ensure migrations don't break existing data
- **Data Migration**: Include data migration scripts when needed
- **Rollback Plan**: Consider rollback scenarios
- **Performance**: Test migration performance on large datasets

**Example Migration:**
```sql
-- Migration: add_user_preferences
ALTER TABLE "User" ADD COLUMN "preferences" JSONB;
ALTER TABLE "User" ADD COLUMN "metadata" JSONB;
ALTER TABLE "User" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create index for tag searches
CREATE INDEX "User_tags_idx" ON "User" USING GIN ("tags");
```

## Documentation

### Code Documentation

- **JSDoc Comments**: Document all public functions and classes
- **Type Annotations**: Use comprehensive type annotations
- **README Updates**: Update README files when adding features
- **API Documentation**: Ensure OpenAPI metadata is complete

**Example:**
```typescript
/**
 * Retrieves a user by their unique identifier
 * @param userId - The unique identifier of the user
 * @param requesterId - The ID of the user making the request
 * @returns Promise resolving to user data or null if not found
 * @throws {ApiError} When user is not found or access is denied
 */
async getUserById(userId: string, requesterId?: string): Promise<User | null> {
  // Implementation
}
```

### API Documentation

- **OpenAPI Metadata**: Add complete metadata to all endpoints
- **Examples**: Include request/response examples
- **Error Responses**: Document all possible error responses
- **Migration Guides**: Provide migration guides for version changes

## Pull Request Process

### Before Submitting

1. **Run all tests**: Ensure all tests pass
   ```bash
   npm run backend:test
   npm run validate
   ```

2. **Check code quality**:
   ```bash
   cd backend
   npm run type-check
   npm run lint
   ```

3. **Update documentation**: Update relevant documentation
4. **Test manually**: Test your changes manually
5. **Rebase on main**: Ensure your branch is up to date

### Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No breaking changes (or breaking changes documented)
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Reviewer should test the changes
4. **Documentation**: Ensure documentation is updated
5. **Approval**: Maintainer approval required for merge

## Issue Reporting

### Bug Reports

When reporting bugs, include:

- **Environment**: OS, Node.js version, Docker version
- **Steps to Reproduce**: Clear steps to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error logs or stack traces
- **Screenshots**: If applicable

**Bug Report Template:**
```markdown
## Bug Description
Clear description of the bug

## Environment
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.17.0]
- Docker: [e.g., 20.10.21]

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Logs
```
Relevant logs here
```

## Additional Context
Any additional context or screenshots
```

### Feature Requests

When requesting features, include:

- **Use Case**: Why is this feature needed?
- **Proposed Solution**: How should it work?
- **Alternatives**: Alternative solutions considered
- **Additional Context**: Any additional context

## Code Review Process

### For Reviewers

- **Functionality**: Does the code work as intended?
- **Code Quality**: Is the code clean and maintainable?
- **Performance**: Are there any performance concerns?
- **Security**: Are there any security implications?
- **Testing**: Are tests comprehensive and meaningful?
- **Documentation**: Is documentation updated and accurate?

### Review Checklist

- [ ] Code follows project conventions
- [ ] Tests are comprehensive and pass
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance impact considered
- [ ] Breaking changes documented
- [ ] Error handling is appropriate

### Feedback Guidelines

- **Be Constructive**: Provide helpful, actionable feedback
- **Be Specific**: Point to specific lines or issues
- **Suggest Solutions**: Don't just point out problems
- **Be Respectful**: Maintain a professional tone
- **Explain Reasoning**: Explain why changes are needed

## Getting Help

### Resources

- **Documentation**: Check existing documentation first
- **Issues**: Search existing issues for similar problems
- **Discussions**: Use GitHub Discussions for questions
- **Code Examples**: Refer to existing code patterns

### Contact

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code-specific questions

## Recognition

Contributors will be recognized in:

- **CONTRIBUTORS.md**: List of all contributors
- **Release Notes**: Major contributions mentioned in releases
- **GitHub**: Contributor statistics and recognition

Thank you for contributing to the Backend API project! Your contributions help make this project better for everyone.