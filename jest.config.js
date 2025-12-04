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
  testTimeout: 30000,
  // Handle ES modules and dynamic imports
  transform: {},
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

