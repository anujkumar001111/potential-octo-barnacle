/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/__tests__', '<rootDir>/electron'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/components/TabBar.tsx',
    'src/components/BrowserArea.tsx',
    'src/utils/detail-view-bounds.ts',
    'src/utils/layout-transition.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
  ],
  // Explicitly tell jest to process electron directory
  transformIgnorePatterns: [
    'node_modules/(?!(@eko-ai)/)',
  ],
};

module.exports = config;
