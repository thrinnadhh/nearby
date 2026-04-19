/**
 * Jest setup for backend tests
 * Mocks Redis, Supabase, and external services
 */

import { jest } from '@jest/globals';

// Mock Redis BEFORE any imports
jest.mock('../services/redis.js', () => ({
  redis: {
    // String operations
    get: jest.fn(async (key) => null),
    set: jest.fn(async () => 'OK'),
    setex: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    exists: jest.fn(async () => 1),
    incr: jest.fn(async () => 1),
    incrby: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
    ttl: jest.fn(async () => -1),
    
    // List operations
    lpush: jest.fn(async () => 1),
    rpush: jest.fn(async () => 1),
    lpop: jest.fn(async () => null),
    lrange: jest.fn(async () => []),
    
    // Hash operations
    hset: jest.fn(async () => 1),
    hget: jest.fn(async () => null),
    hgetall: jest.fn(async () => ({})),
    hdel: jest.fn(async () => 1),
    
    // Set operations
    sadd: jest.fn(async () => 1),
    smembers: jest.fn(async () => []),
    sismember: jest.fn(async () => 0),
    srem: jest.fn(async () => 1),
    
    // Utility
    flushdb: jest.fn(async () => 'OK'),
    flushall: jest.fn(async () => 'OK'),
    ping: jest.fn(async () => 'PONG'),
    
    // Geo operations
    geoadd: jest.fn(async () => 1),
    geopos: jest.fn(async () => null),
  },
}));

// Mock Supabase BEFORE any imports
jest.mock('../services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn(function() { return this; }),
      insert: jest.fn(async (records) => ({ data: records, error: null })),
      update: jest.fn(async (record) => ({ data: record, error: null })),
      delete: jest.fn(async () => ({ data: [], error: null })),
      eq: jest.fn(function() {
        return {
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
      neq: jest.fn(function() { return this; }),
      lt: jest.fn(function() { return this; }),
      lte: jest.fn(function() { return this; }),
      gt: jest.fn(function() { return this; }),
      gte: jest.fn(function() { return this; }),
      limit: jest.fn(function() { return this; }),
      order: jest.fn(function() { return this; }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'mock-user' } } },
        error: null,
      }),
    },
  },
}));

// Mock external services
jest.mock('../services/fcm.js', () => ({
  sendFCM: jest.fn().mockResolvedValue({ messageId: 'mock-123' }),
}));

jest.mock('../services/msg91.js', () => ({
  sendOTP: jest.fn().mockResolvedValue({ request_id: 'mock-123' }),
}));

jest.mock('../services/olaMaps.js', () => ({
  getDistanceMatrix: jest.fn().mockResolvedValue({
    distance_matrix: [[{ elements: [{ distance: { value: 1000 } }] }]],
  }),
  getAutocomplete: jest.fn().mockResolvedValue({
    predictions: [{ description: '123 Main St', place_id: 'mock-123' }],
  }),
}));

jest.mock('../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/file.jpg',
    key: 'file.jpg',
  }),
  generatePresignedUrl: jest.fn().mockResolvedValue({
    url: 'https://r2.example.com/file.jpg?signed',
  }),
}));

jest.mock('../services/typesense.js', () => ({
  typesense: {
    collections: {
      retrieve: jest.fn().mockResolvedValue({ name: 'shops' }),
      create: jest.fn().mockResolvedValue({ name: 'shops' }),
    },
    documents: {
      index: jest.fn().mockResolvedValue({ id: 'mock-123' }),
      upsert: jest.fn().mockResolvedValue({ id: 'mock-123' }),
      delete: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({ hits: [] }),
    },
  },
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.MSG91_AUTH_KEY = 'test-msg91-key';
process.env.FCM_PROJECT_ID = 'test-fcm-project';
process.env.TYPESENSE_ADMIN_API_KEY = 'test-typesense-key';
process.env.TYPESENSE_HOST = 'localhost';
process.env.TYPESENSE_PORT = '8108';
