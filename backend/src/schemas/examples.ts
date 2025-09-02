/**
 * Examples demonstrating how to use the Zod validation schemas
 * This file is for documentation purposes and shows common usage patterns
 */

import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  LoginSchema,
  RegisterSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  SchemaUtils,
  ValidationPatterns,
  ErrorMessages,
  createValidationMiddleware,
} from './index';

// Example 1: Basic schema validation
export function validateUserExample() {
  const userData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'john.doe@example.com',
    name: 'John Doe',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  // Safe parsing (returns result object)
  const result = UserSchema.safeParse(userData);
  if (result.success) {
    console.log('Valid user:', result.data);
    return result.data;
  } else {
    console.error('Validation errors:', result.error.issues);
    return null;
  }
}

// Example 2: Using SchemaUtils for validation
export function validateWithUtilsExample() {
  const createUserData = {
    email: 'jane.doe@example.com',
    name: 'Jane Doe',
  };

  const result = SchemaUtils.validateData(CreateUserSchema, createUserData);
  if (result.success) {
    console.log('User creation data is valid:', result.data);
    return result.data;
  } else {
    console.error('Validation failed:', result.error.message);
    return null;
  }
}

// Example 3: Creating API response schemas
export function createApiResponseExample() {
  // Create a response schema for user data
  const UserApiResponseSchema = ApiResponseSchema(UserSchema);
  
  const responseData = {
    success: true,
    data: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@example.com',
      name: 'John Doe',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    },
    timestamp: new Date().toISOString(),
  };

  const result = UserApiResponseSchema.safeParse(responseData);
  return result.success ? result.data : null;
}

// Example 4: Creating paginated response schemas
export function createPaginatedResponseExample() {
  const PaginatedUserSchema = PaginatedResponseSchema(UserSchema);
  
  const paginatedData = {
    items: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user1@example.com',
        name: 'User One',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        email: 'user2@example.com',
        name: 'User Two',
        createdAt: '2023-01-02T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      },
    ],
    total: 2,
    page: 1,
    limit: 10,
    hasNext: false,
    hasPrev: false,
  };

  const result = PaginatedUserSchema.safeParse(paginatedData);
  return result.success ? result.data : null;
}

// Example 5: Authentication schema validation
export function validateAuthenticationExample() {
  // Login validation
  const loginData = {
    email: 'user@example.com',
    password: 'securePassword123',
  };

  const loginResult = LoginSchema.safeParse(loginData);
  if (!loginResult.success) {
    console.error('Login validation failed:', loginResult.error.issues);
    return false;
  }

  // Registration validation
  const registerData = {
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    name: 'New User',
    confirmPassword: 'SecurePassword123!',
  };

  const registerResult = RegisterSchema.safeParse(registerData);
  if (!registerResult.success) {
    console.error('Registration validation failed:', registerResult.error.issues);
    return false;
  }

  return true;
}

// Example 6: Using validation patterns
export function validatePatternsExample() {
  const examples = {
    phone: '+1234567890',
    url: 'https://example.com',
    hexColor: '#FF0000',
    positiveInt: 42,
    percentage: 85.5,
  };

  const results = {
    phone: ValidationPatterns.phone.safeParse(examples.phone).success,
    url: ValidationPatterns.url.safeParse(examples.url).success,
    hexColor: ValidationPatterns.hexColor.safeParse(examples.hexColor).success,
    positiveInt: ValidationPatterns.positiveInt.safeParse(examples.positiveInt).success,
    percentage: ValidationPatterns.percentage.safeParse(examples.percentage).success,
  };

  console.log('Validation pattern results:', results);
  return results;
}

// Example 7: Using schema composition utilities
export function schemaCompositionExample() {
  // Create a partial schema (all fields optional)
  const PartialUserSchema = SchemaUtils.createPartialSchema(CreateUserSchema);
  
  const partialData = { email: 'partial@example.com' };
  const partialResult = PartialUserSchema.safeParse(partialData);
  
  // Create an array schema with constraints
  const UserArraySchema = SchemaUtils.createArraySchema(CreateUserSchema, {
    min: 1,
    max: 10,
    message: 'Must have between 1 and 10 users',
  });
  
  const arrayData = [
    { email: 'user1@example.com', name: 'User 1' },
    { email: 'user2@example.com', name: 'User 2' },
  ];
  
  const arrayResult = UserArraySchema.safeParse(arrayData);
  
  return {
    partial: partialResult.success,
    array: arrayResult.success,
  };
}

// Example 8: Using validation middleware
export function validationMiddlewareExample() {
  const validateCreateUser = createValidationMiddleware(CreateUserSchema);
  
  try {
    const validData = validateCreateUser({
      email: 'test@example.com',
      name: 'Test User',
    });
    console.log('Validated data:', validData);
    return validData;
  } catch (error) {
    console.error('Validation middleware error:', error);
    return null;
  }
}

// Example 9: Error handling with custom messages
export function errorHandlingExample() {
  const invalidData = {
    email: 'invalid-email',
    name: '', // Empty name
  };

  const result = CreateUserSchema.safeParse(invalidData);
  if (!result.success) {
    const errors = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    
    console.log('Formatted validation errors:', errors);
    return errors;
  }
  
  return [];
}

// Example 10: Transform data after validation
export function transformDataExample() {
  const EmailNormalizationSchema = SchemaUtils.withTransform(
    CreateUserSchema,
    (data) => ({
      ...data,
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
    })
  );

  const inputData = {
    email: '  TEST@EXAMPLE.COM  ',
    name: '  John Doe  ',
  };

  const result = EmailNormalizationSchema.safeParse(inputData);
  if (result.success) {
    console.log('Transformed data:', result.data);
    // Output: { email: 'test@example.com', name: 'John Doe' }
    return result.data;
  }
  
  return null;
}