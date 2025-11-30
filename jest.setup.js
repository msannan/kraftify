// Jest setup file
// This runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_NAME = process.env.DB_NAME || 'kraftify_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

// Initialize database - import database config to trigger table creation
const dbConfig = require('./server/config/database');

// Wait for tables to be created
beforeAll(async () => {
  // Give database time to create tables (they're created on module load)
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Verify tables exist by checking if we can query
  const pool = dbConfig.pool;
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
});

// Clean up database connections after all tests
afterAll(async () => {
  const pool = dbConfig.pool;
  await pool.end();
});

// Increase timeout for async operations
jest.setTimeout(30000);

