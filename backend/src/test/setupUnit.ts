// Unit test setup - no database required
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout (only set if Jest is available)
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}