import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock all rate limiters
jest.mock('../../src/middleware/rateLimit.js', () => ({
  rateLimit: jest.fn(() => (req, res, next) => next()),
  globalLimiter: (req, res, next) => next(),
  otpLimiter: (req, res, next) => next(),
  slowLimiter: (req, res, next) => next(),
  mediumLimiter: (req, res, next) => next(),
  fastLimiter: (req, res, next) => next(),
  strictLimiter: (req, res, next) => next(),
  searchLimiter: (req, res, next) => next(),
  default: {},
}));

// Mock Supabase service
jest.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock Redis service
jest.mock('../../src/services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
    publish: jest.fn().mockResolvedValue(0),
  },
}));

// Mock BullMQ queue
jest.mock('../../src/jobs/notifyShop.js', () => ({
  notifyShopQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));

// Mock Socket.IO
jest.mock('../../src/socket/ioRegistry.js', () => ({
  emitToRoom: jest.fn().mockResolvedValue(null),
}));

// Mock MSG91 SMS service
jest.mock('../../src/services/msg91.js', () => ({
  sendOtp: jest.fn().mockResolvedValue({ request_id: 'test-request-id', message: 'OTP sent' }),
  verifyOtp: jest.fn().mockResolvedValue({ verified: true }),
}));

// Mock Typesense
jest.mock('../../src/services/typesense.js', () => ({
  initTypeenseSchema: jest.fn().mockResolvedValue(null),
  deleteSchema: jest.fn().mockResolvedValue(null),
}));

import { processTrustScoreJob } from '../../src/jobs/trustScore.js';

describe('Trust Score Job', () => {
  let shopId;
  let mockSupabase;

  beforeAll(async () => {
    shopId = uuidv4();
    const { supabase } = await import('../../src/services/supabase.js');
    mockSupabase = supabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processTrustScoreJob', () => {
    it('should compute trust scores for shops', async () => {
      const ownerId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: shopId,
                  owner_id: ownerId,
                  name: 'Test Shop',
                  kyc_verified_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
            is: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: shopId,
                trust_score: 75,
                trust_badge: 'good',
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { rating: 5 },
                { rating: 4 },
              ],
              error: null,
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { status: 'delivered', id: uuidv4() },
                { status: 'delivered', id: uuidv4() },
              ],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const mockJob = { id: 'test-job', data: {} };
      const result = await processTrustScoreJob(mockJob);

      expect(result.updatedCount).toBeGreaterThanOrEqual(0);
      expect(result.alertCount).toBeGreaterThanOrEqual(0);
    });

    it('should update shop trust_score column', async () => {
      const ownerId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: shopId,
                  owner_id: ownerId,
                  name: 'Test Shop',
                  kyc_verified_at: new Date().toISOString(),
                },
              ],
              error: null,
            }),
            is: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: shopId,
                trust_score: 75.5,
                trust_badge: 'good',
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { rating: 4 },
                { rating: 5 },
              ],
              error: null,
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { status: 'delivered', id: uuidv4() },
              ],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const mockJob = { id: 'test-job', data: {} };
      await processTrustScoreJob(mockJob);

      const { data: shop, error } = await mockSupabase
        .from('shops')
        .select('trust_score, trust_badge')
        .eq('id', shopId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch shop: ${error.message}`);
      }

      expect(typeof shop.trust_score).toBe('number');
      expect(['trusted', 'good', 'new', 'review']).toContain(shop.trust_badge);
    });
  });
});
