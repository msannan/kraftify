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
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/index.js',
    '!server/config/database.js'
  ],
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!@xenova/transformers)'
  ],
  moduleNameMapper: {
    '^@xenova/transformers$': '<rootDir>/server/__mocks__/transformers.js'
  }
};

