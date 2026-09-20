module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['apps/**/*.(t|j)s', '!apps/**/*.spec.ts', '!apps/**/*.module.ts', '!apps/api/src/main.ts'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/apps/api/src/$1',
    '^@common/(.*)$': '<rootDir>/apps/api/src/common/$1',
  },
};
