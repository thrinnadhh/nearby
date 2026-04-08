import request from 'supertest';

const mockRedisStore = new Map();
const mockProfileStore = new Map();

jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn(async (key) => (mockRedisStore.has(key) ? mockRedisStore.get(key) : null)),
    setex: jest.fn(async (key, _ttl, value) => {
      mockRedisStore.set(key, value);
      return 'OK';
    }),
    exists: jest.fn(async (key) => (mockRedisStore.has(key) ? 1 : 0)),
    ttl: jest.fn(async () => 600),
    del: jest.fn(async (...keys) => {
      keys.flat().forEach((key) => mockRedisStore.delete(key));
      return 1;
    }),
    incr: jest.fn(async (key) => {
      const nextValue = String(Number(mockRedisStore.get(key) || '0') + 1);
      mockRedisStore.set(key, nextValue);
      return Number(nextValue);
    }),
    expire: jest.fn(async () => 1),
    ping: jest.fn().mockResolvedValue('PONG'),
    call: jest.fn().mockResolvedValue(null),
    keys: jest.fn(async (pattern) => {
      const prefix = pattern.replace('*', '');
      return [...mockRedisStore.keys()].filter((key) => key.startsWith(prefix));
    }),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table !== 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      let mode = 'select';
      let phone = null;
      let insertRecord = null;

      const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn((record) => {
          mode = 'insert';
          insertRecord = record;
          return chain;
        }),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn((field, value) => {
          if (field === 'phone') phone = value;
          return chain;
        }),
        single: jest.fn(async () => {
          if (mode === 'insert') {
            const record = Array.isArray(insertRecord) ? insertRecord[0] : insertRecord;
            mockProfileStore.set(record.phone, record);
            return {
              data: {
                id: record.id,
                phone: record.phone,
                role: record.role,
                shop_id: record.shop_id || null,
              },
              error: null,
            };
          }

          const profile = mockProfileStore.get(phone);
          if (!profile) {
            return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
          }

          return {
            data: {
              id: profile.id,
              phone: profile.phone,
              role: profile.role,
              shop_id: profile.shop_id || null,
            },
            error: null,
          };
        }),
      };

      return chain;
    }),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock('../../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({ ETag: '"test-etag"' }),
  getSignedFileUrl: jest.fn().mockResolvedValue('https://example.r2.dev/signed'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/msg91.js', () => ({
  sendOtp: jest.fn().mockResolvedValue({ type: 'success' }),
  sendNotification: jest.fn().mockResolvedValue({ type: 'success' }),
}));

jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
  typesenseSyncWorker: {},
}));

jest.mock('../../services/typesense.js', () => {
  const collections = Object.assign(
    jest.fn(() => ({
      documents: jest.fn(() => ({
        search: jest.fn().mockResolvedValue({ found: 0, page: 1, hits: [] }),
      })),
    })),
    {
      retrieve: jest.fn().mockResolvedValue([]),
    }
  );

  return {
    typesense: { collections },
    ensureTypesenseCollections: jest.fn().mockResolvedValue({ created: [], existing: [] }),
  };
});

import { app } from '../../index.js';
import { redis } from '../../services/redis.js';
import { verifyToken } from '../../middleware/auth.js';

describe('Sprint 1 E2E verification', () => {
  beforeEach(() => {
    mockRedisStore.clear();
    mockProfileStore.clear();
    jest.clearAllMocks();
  });

  it('passes health and readiness checks with mocked dependencies', async () => {
    const health = await request(app).get('/health').expect(200);
    expect(health.body.success).toBe(true);
    expect(health.body.data.status).toBe('ok');

    const readiness = await request(app).get('/readiness').expect(200);
    expect(readiness.body.success).toBe(true);
    expect(readiness.body.data.readiness).toBe(true);
    expect(readiness.body.data.checks.redis.status).toBe('ready');
    expect(readiness.body.data.checks.supabase.status).toBe('ready');
    expect(readiness.body.data.checks.typesense.status).toBe('ready');
  });

  it('completes OTP send and verify flow end-to-end', async () => {
    const phone = '9876543210';

    const sendResponse = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone })
      .expect(200);

    expect(sendResponse.body.success).toBe(true);
    expect(sendResponse.body.data.status).toBe('otp_sent');

    const storedOtp = await redis.get(`otp:code:${phone}`);
    expect(storedOtp).toMatch(/^\d{6}$/);

    const verifyResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone, otp: storedOtp })
      .expect(200);

    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.data.phone).toBe(`+91${phone}`);
    expect(verifyResponse.body.data.role).toBe('customer');
    expect(verifyResponse.body.data.token).toBeDefined();

    const decoded = verifyToken(verifyResponse.body.data.token);
    expect(decoded.userId).toBe(verifyResponse.body.data.userId);
    expect(decoded.role).toBe('customer');
  });
});
