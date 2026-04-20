/**
 * Jest setup file for React Native testing
 * Configures global test environment and mocks
 */

// Set required environment variables before any imports
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
process.env.EXPO_PUBLIC_SOCKET_URL = 'http://localhost:3001';
// React Native global
global.__DEV__ = true;

// Register @testing-library/react-native custom matchers (toHaveStyle, toHaveTextContent, etc.)
require('@testing-library/react-native/extend-expect');

// Mock expo-secure-store before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  MaterialIcons: 'MaterialIcons',
  Feather: 'Feather',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  useAsyncStorage: jest.fn(() => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    mergeItem: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
}));

// Mock socket.io-client — this factory is used by tests that do NOT call
// jest.mock('socket.io-client') themselves. Tests that DO call
// jest.mock('socket.io-client') without a factory will use __mocks__/socket.io-client.js.
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    id: 'mock-socket-id',
    connected: true,
  };
  const mockIo = jest.fn(() => mockSocket);
  // Support both default import (import io from ...) and named import (import { io } from ...)
  mockIo.default = mockIo;
  mockIo.io = mockIo;
  return mockIo;
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: function ({ children }) {
      return React.createElement(React.Fragment, null, children);
    },
    useFocusEffect: jest.fn((cb) => cb()),
    useNavigation: jest.fn(() => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    })),
  };
});

// Mock react-native-date-picker — not installed, use virtual mock
jest.mock(
  'react-native-date-picker',
  () => {
    const React = require('react');
    return function DatePicker({ testID }) {
      return React.createElement('View', { testID: testID || 'date-picker' });
    };
  },
  { virtual: true }
);

// Mock @react-native-community/slider — not installed, use virtual mock
jest.mock(
  '@react-native-community/slider',
  () => {
    const React = require('react');
    return function Slider(props) {
      return React.createElement('View', { testID: props.testID || 'slider' });
    };
  },
  { virtual: true }
);

// Mock expo-file-system — native module not available in test environment
jest.mock('expo-file-system', () => ({
  downloadAsync: jest.fn().mockResolvedValue({ uri: '/tmp/test.pdf', status: 200 }),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  documentDirectory: '/tmp/documents/',
  cacheDirectory: '/tmp/cache/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    type: 'cancel',
  }),
  DocumentPickerResult: {},
}));

// Mock expo-sharing — not installed, use virtual mock
jest.mock(
  'expo-sharing',
  () => ({
    shareAsync: jest.fn().mockResolvedValue(undefined),
    isAvailableAsync: jest.fn().mockResolvedValue(true),
  }),
  { virtual: true }
);

// Suppress console.log/warn in tests for clean output
const originalConsoleError = console.error;
global.console = {
  ...console,
  warn: jest.fn(),
  log: jest.fn(),
  error: originalConsoleError,
};

// Mock react-native-gesture-handler
jest.doMock(
  'react-native-gesture-handler',
  () => ({
    RectButton: jest.fn(),
    Swipeable: jest.fn(),
  }),
  { virtual: true }
);

// Cleanup after each test — prevent memory leaks and infinite loops
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  // jest.resetModules(); // Disabled - breaks React hook dispatcher between tests

  // Reset Zustand earnings store state between tests
  // This prevents state leakage across test suites
  const { useEarningsStore } = require('@/store/earnings');
  useEarningsStore.setState({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    dateRange: '30d',
    isOffline: false,
  });
});
