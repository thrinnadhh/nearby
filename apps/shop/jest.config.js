module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  // Use babel-jest for ALL files (TypeScript + JS)
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  // Allow transforming Expo and React Native ESM packages
  transformIgnorePatterns: [
    'node_modules/(?!(expo-secure-store|expo-router|expo-font|expo-splash-screen|expo-status-bar|expo-notifications|expo/|@expo/vector-icons|@expo/|@react-native|react-native|@testing-library/react-native|socket\\.io-client|engine\\.io-client|@react-navigation|react-native-screens|react-native-gesture-handler|zustand)/)',
  ],
  moduleNameMapper: {
    // Resolve @/ alias to src/
    '^@/(.*)$': '<rootDir>/src/$1',
    // Map logger mock - must come after @/ alias mapping
    '^@/utils/logger$': '<rootDir>/src/utils/__mocks__/logger',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
    '!src/constants/**',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
