import { RegisterSchema } from '../schemas/auth';

const input = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123',
  confirmPassword: 'password123',
};

try {
  const result = RegisterSchema.parse(input);
  console.log('Validation passed:', result);
} catch (error) {
  console.error('Validation failed:', error);
}