// Jest setup file - Simple setup without database

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Increase timeout for async operations
jest.setTimeout(10000);
