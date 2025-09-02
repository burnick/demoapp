import { config, isDevelopment } from '../utils/config';
import { Logger } from '../utils/logger';
import { ValidationError, ErrorHandler } from '../utils/errors';
import { ResponseHelper, ValidationHelper, PasswordHelper, StringHelper } from '../utils/helpers';

describe('Core Utilities', () => {
  describe('Configuration', () => {
    it('should load configuration successfully', () => {
      expect(config).toBeDefined();
      expect(config.NODE_ENV).toBeDefined();
      expect(config.PORT).toBeGreaterThan(0);
    });

    it('should detect development environment', () => {
      expect(typeof isDevelopment()).toBe('boolean');
    });
  });

  describe('Logger', () => {
    it('should log messages without errors', () => {
      expect(() => {
        Logger.info('Test message');
        Logger.debug('Debug message', { test: true });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should create validation error from Zod error', () => {
      const zodError = new (require('zod')).ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const validationError = ValidationError.fromZodError(zodError);
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.statusCode).toBe(400);
    });

    it('should convert any error to ApiError', () => {
      const error = new Error('Test error');
      const apiError = ErrorHandler.toApiError(error);
      
      expect(apiError.statusCode).toBe(500);
      expect(apiError.message).toBe('Test error');
    });
  });

  describe('Response Helper', () => {
    it('should create success response', () => {
      const response = ResponseHelper.success({ id: 1, name: 'Test' });
      
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(response.timestamp).toBeDefined();
    });

    it('should create error response', () => {
      const response = ResponseHelper.error('TEST_ERROR', 'Test error message');
      
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TEST_ERROR');
      expect(response.error?.message).toBe('Test error message');
    });
  });

  describe('Validation Helper', () => {
    it('should validate data successfully', () => {
      const { z } = require('zod');
      const schema = z.object({ name: z.string() });
      
      const result = ValidationHelper.validate(schema, { name: 'Test' }) as { name: string };
      expect(result.name).toBe('Test');
    });

    it('should throw ValidationError for invalid data', () => {
      const { z } = require('zod');
      const schema = z.object({ name: z.string() });
      
      expect(() => {
        ValidationHelper.validate(schema, { name: 123 });
      }).toThrow(ValidationError);
    });
  });

  describe('Password Helper', () => {
    it('should hash and compare passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordHelper.hash(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      
      const isValid = await PasswordHelper.compare(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await PasswordHelper.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should validate password strength', () => {
      expect(PasswordHelper.validateStrength('TestPassword123!')).toBe(true);
      expect(PasswordHelper.validateStrength('weak')).toBe(false);
    });
  });

  describe('String Helper', () => {
    it('should generate random string', () => {
      const random1 = StringHelper.random(10);
      const random2 = StringHelper.random(10);
      
      expect(random1).toHaveLength(10);
      expect(random2).toHaveLength(10);
      expect(random1).not.toBe(random2);
    });

    it('should slugify text', () => {
      expect(StringHelper.slugify('Hello World!')).toBe('hello-world');
      expect(StringHelper.slugify('Test_String-123')).toBe('test-string-123');
    });

    it('should capitalize text', () => {
      expect(StringHelper.capitalize('hello world')).toBe('Hello world');
    });

    it('should truncate text', () => {
      expect(StringHelper.truncate('Hello World', 5)).toBe('He...');
      expect(StringHelper.truncate('Hi', 5)).toBe('Hi');
    });
  });
});