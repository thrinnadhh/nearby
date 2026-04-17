/**
 * Jest setup file for React Native testing
 * Configures global test environment and mocks
 */

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
  Feather: () => null,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Suppress console warnings/errors in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock react-native-gesture-handler
jest.doMock('react-native-gesture-handler', () => ({
  RectButton: jest.fn(),
  Swipeable: jest.fn(),
}), { virtual: true });

// Mock react-native-screens
jest.doMock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}), { virtual: true });

// Suppress Hermes and other React Native warnings
if (typeof Symbol === 'undefined') {
  global.Symbol = require('symbol-polyfill');
}

// Mock TextEncoder/TextDecoder if needed
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
