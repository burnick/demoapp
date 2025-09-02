import * as jwt from 'jsonwebtoken';

// Simple test to verify JWT signing works
const secret = 'test-secret-that-is-at-least-32-characters-long';

try {
  const token = jwt.sign(
    { userId: '123', email: 'test@example.com', type: 'access' },
    secret,
    { expiresIn: '15m' }
  );
  console.log('JWT signing works:', token);
} catch (error) {
  console.error('JWT signing failed:', error);
}