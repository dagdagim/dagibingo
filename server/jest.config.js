module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@bingo/shared$': '<rootDir>/../packages/shared/src/index.ts',
  },
};
