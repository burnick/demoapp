import { describe, it, expect } from '@jest/globals';
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
} from '../schemas';

describe('Schema Validation Tests', () => {
  describe('User Schemas', () => {
    it('should validate a valid user object', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validUser);
      }
    });

    it('should reject invalid user email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        name: 'John Doe',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should validate create user schema', () => {
      const createUserData = {
        email: 'test@example.com',
        name: 'John Doe',
      };

      const result = CreateUserSchema.safeParse(createUserData);
      expect(result.success).toBe(true);
    });

    it('should validate update user schema with partial data', () => {
      const updateData = {
        name: 'Jane Doe',
      };

      const result = UpdateUserSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it('should reject empty update user schema', () => {
      const emptyUpdate = {};

      const result = UpdateUserSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('Authentication Schemas', () => {
    it('should validate login schema', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = LoginSchema.safeParse(loginData);
      expect(result.success).toBe(true);
    });

    it('should validate register schema with matching passwords', () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        confirmPassword: 'Password123!',
      };

      const result = RegisterSchema.safeParse(registerData);
      expect(result.success).toBe(true);
    });

    it('should reject register schema with mismatched passwords', () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        confirmPassword: 'DifferentPassword123!',
      };

      const result = RegisterSchema.safeParse(registerData);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords', () => {
      const registerData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe',
        confirmPassword: 'weak',
      };

      const result = RegisterSchema.safeParse(registerData);
      expect(result.success).toBe(false);
    });
  });

  describe('Common Schemas', () => {
    it('should create API response schema', () => {
      const userResponseSchema = ApiResponseSchema(UserSchema);
      const responseData = {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          name: 'John Doe',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      const result = userResponseSchema.safeParse(responseData);
      expect(result.success).toBe(true);
    });

    it('should create paginated response schema', () => {
      const paginatedUserSchema = PaginatedResponseSchema(UserSchema);
      const paginatedData = {
        items: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            name: 'John Doe',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false,
      };

      const result = paginatedUserSchema.safeParse(paginatedData);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Utils', () => {
    it('should validate data using SchemaUtils', () => {
      const testData = {
        email: 'test@example.com',
        name: 'John Doe',
      };

      const result = SchemaUtils.validateData(CreateUserSchema, testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(testData);
      }
    });

    it('should return error for invalid data using SchemaUtils', () => {
      const invalidData = {
        email: 'invalid-email',
        name: '',
      };

      const result = SchemaUtils.validateData(CreateUserSchema, invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should create partial schema', () => {
      const partialUserSchema = SchemaUtils.createPartialSchema(CreateUserSchema);
      const partialData = { email: 'test@example.com' };

      const result = partialUserSchema.safeParse(partialData);
      expect(result.success).toBe(true);
    });

    it('should create array schema with validation', () => {
      const arraySchema = SchemaUtils.createArraySchema(CreateUserSchema, {
        min: 1,
        max: 5,
      });

      const validArray = [
        { email: 'test1@example.com', name: 'User 1' },
        { email: 'test2@example.com', name: 'User 2' },
      ];

      const result = arraySchema.safeParse(validArray);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation Patterns', () => {
    it('should validate phone numbers', () => {
      const validPhone = '+1234567890';
      const invalidPhone = '123-456-7890';

      expect(ValidationPatterns.phone.safeParse(validPhone).success).toBe(true);
      expect(ValidationPatterns.phone.safeParse(invalidPhone).success).toBe(false);
    });

    it('should validate URLs', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = 'not-a-url';

      expect(ValidationPatterns.url.safeParse(validUrl).success).toBe(true);
      expect(ValidationPatterns.url.safeParse(invalidUrl).success).toBe(false);
    });

    it('should validate hex colors', () => {
      const validColor = '#FF0000';
      const validShortColor = '#F00';
      const invalidColor = 'red';

      expect(ValidationPatterns.hexColor.safeParse(validColor).success).toBe(true);
      expect(ValidationPatterns.hexColor.safeParse(validShortColor).success).toBe(true);
      expect(ValidationPatterns.hexColor.safeParse(invalidColor).success).toBe(false);
    });

    it('should validate positive integers', () => {
      expect(ValidationPatterns.positiveInt.safeParse(5).success).toBe(true);
      expect(ValidationPatterns.positiveInt.safeParse(0).success).toBe(false);
      expect(ValidationPatterns.positiveInt.safeParse(-1).success).toBe(false);
    });
  });
});