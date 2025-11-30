module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/client/',
    '/uploads/'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  testTimeout: 10000
};

