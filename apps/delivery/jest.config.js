module.exports = {
  // Use jsdom for hook and component tests (supports renderHook + DOM features)
  testEnvironment: 'jsdom',
  
  // Use ts-jest to handle TypeScript files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Module alias mapping (matches tsconfig.json paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Setup files before all tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Allow these modules to be transformed (they're ES modules)
  transformIgnorePatterns: [
    'node_modules/(?!(expo|expo-file-system|expo-constants|expo-notifications|expo-secure-store|@react-native-async-storage|@expo/vector-icons|react-native)/)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/expo-router/**',
  ],

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
