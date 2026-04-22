/**
 * Jest setup for backend integration tests
 * Mocks Redis and Supabase services
 */

// Must come before any imports to set up mocks
jest.mock('../src/services/redis.js', () => require('./mocks/redis.js'));
jest.mock('../src/services/supabase.js', () => require('./mocks/supabase.js'));

// Mock BullMQ to prevent Redis connection attempts in tests
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue({}),
  })),
}));

// Mock external services that require credentials
jest.mock('../src/services/fcm.js', () => ({
  fcm: {
    sendNotification: jest.fn().mockResolvedValue({ messageId: 'mock-123' }),
    sendHighPriorityNotification: jest.fn().mockResolvedValue({ messageId: 'mock-123' }),
  },
  sendNotification: jest.fn().mockResolvedValue({ messageId: 'mock-123' }),
  sendHighPriorityNotification: jest.fn().mockResolvedValue({ messageId: 'mock-123' }),
}));

jest.mock('../src/services/msg91.js', () => ({
  msg91: {
    sendOtp: jest.fn().mockResolvedValue({ request_id: 'mock-123' }),
    sendNotification: jest.fn().mockResolvedValue({ request_id: 'mock-123' }),
    sendSMS: jest.fn().mockResolvedValue({ request_id: 'mock-sms-123' }),
  },
  sendOtp: jest.fn().mockResolvedValue({ request_id: 'mock-123' }),
  sendNotification: jest.fn().mockResolvedValue({ request_id: 'mock-123' }),
  sendSMS: jest.fn().mockResolvedValue({ request_id: 'mock-sms-123' }),
}));

jest.mock('../src/services/olaMaps.js', () => ({
  getDistanceMatrix: jest.fn().mockResolvedValue({
    distance_matrix: [
      [
        { elements: [{ distance: { value: 1000 } }] }
      ]
    ],
  }),
  getAutocomplete: jest.fn().mockResolvedValue({
    predictions: [{ description: '123 Main St', place_id: 'mock-123' }],
  }),
}));

jest.mock('../src/services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/file.jpg',
    key: 'file.jpg',
  }),
  generatePresignedUrl: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/file.jpg?signed',
  }),
}));

jest.mock('../src/services/typesense.js', () => {
  const mockCollectionsWithName = (collectionName) => ({
    create: jest.fn().mockResolvedValue({ name: collectionName || 'moderation' }),
    documents: jest.fn(docId => ({
      delete: jest.fn().mockResolvedValue({ id: docId }),
    })),
  });

  return {
    typesense: {
      collections: jest.fn((name) => {
        if (name) {
          return mockCollectionsWithName(name);
        }
        return {
          create: jest.fn().mockResolvedValue({ name: 'test-collection' }),
          retrieve: jest.fn().mockResolvedValue([]),
        };
      }),
    },
    ensureTypesenseCollections: jest.fn().mockResolvedValue({
      created: [],
      existing: [],
    }),
  };
});

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MSG91_AUTH_KEY = 'test-msg91-key';
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUUID = 'test-uuid-1234-5678-9012-3456';
global.testPhone = '9876543210';
global.testEmail = 'test@example.com';

// Timeout for all integration tests (30 seconds)
jest.setTimeout(30000);
