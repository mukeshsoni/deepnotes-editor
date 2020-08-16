module.exports = {
  testMatch: ['**/__tests__/**/*.tests.js'],
  transform: { '^.+\\.tsx?$': ['ts-jest'], '^.+\\.jsx?$': 'babel-jest' },
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
};
