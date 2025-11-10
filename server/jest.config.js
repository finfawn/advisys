module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
};