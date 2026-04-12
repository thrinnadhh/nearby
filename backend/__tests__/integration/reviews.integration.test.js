import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../../src/middleware/auth.js';

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

// Mock Redis service
jest.mock('../../src/services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
  },
}));

// Mock Supabase service
jest.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
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

import { app } from '../../src/index.js';

describe('Reviews API', () => {
  let customerId;
  let shopId;
  let orderId;
  let customerToken;
  let mockSupabase;

  beforeAll(async () => {
    customerId = uuidv4();
    shopId = uuidv4();
    orderId = uuidv4();

    customerToken = generateToken({
      userId: customerId,
      phone: '9876543210',
      role: 'customer',
    });

    const { supabase } = await import('../../src/services/supabase.js');
    mockSupabase = supabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/reviews', () => {
    it('should create a review for a delivered order', async () => {
      const reviewId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'delivered',
                delivered_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          let callCount = 0;
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call is checking for existing review (should return null)
                return {
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }
              // Second call is after insert (not used)
              return {
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              };
            }),
            single: jest.fn().mockResolvedValue({
              data: {
                id: reviewId,
                order_id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                rating: 5,
                comment: 'Great shop!',
                is_visible: true,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: orderId,
          rating: 5,
          comment: 'Great shop!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.comment).toBe('Great shop!');
    });

    it('should not allow duplicate reviews', async () => {
      const reviewId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'delivered',
                delivered_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: reviewId,
                order_id: orderId,
                customer_id: customerId,
                rating: 5,
                comment: 'Already reviewed',
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: orderId,
          rating: 4,
          comment: 'Actually OK',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
    });

    it('should reject review for non-delivered order', async () => {
      const pendingOrderId = uuidv4();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: pendingOrderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'pending',
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: pendingOrderId,
          rating: 3,
          comment: 'Quick delivery',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ORDER_NOT_DELIVERED');
    });

    it('should validate rating range (1–5)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: orderId,
          rating: 10,
          comment: 'Invalid rating',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should allow empty comment', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                status: 'delivered',
                delivered_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          let callCount = 0;
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // Checking for existing review
                return {
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }
              return {
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              };
            }),
            single: jest.fn().mockResolvedValue({
              data: {
                id: uuidv4(),
                order_id: orderId,
                customer_id: customerId,
                shop_id: shopId,
                rating: 4,
                comment: '',
                is_visible: true,
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          order_id: orderId,
          rating: 4,
          comment: '',
        });

      expect([201, 409]).toContain(res.status);
    });
  });

  describe('GET /api/v1/reviews/:shopId/reviews', () => {
    it('should list reviews for a shop', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                {
                  id: uuidv4(),
                  order_id: orderId,
                  customer_id: customerId,
                  shop_id: shopId,
                  rating: 5,
                  comment: 'Great!',
                  is_visible: true,
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
              count: 1,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/reviews`)
        .query({ page: 1, limit: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should paginate reviews', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                {
                  id: uuidv4(),
                  order_id: orderId,
                  customer_id: customerId,
                  shop_id: shopId,
                  rating: 4,
                  comment: 'Good',
                  is_visible: true,
                  created_at: new Date().toISOString(),
                },
              ],
              error: null,
              count: 3,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/reviews`)
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/reviews/:shopId/review-stats', () => {
    it('should return review statistics', async () => {
      // The new implementation uses DB aggregation: select('rating.avg(), rating.count()')
      // Chain: .from('reviews').select(...).eq(...).eq(...).single()
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { 'rating.avg()': 4.33, 'rating.count()': 3 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/review-stats`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.avgRating).toBe('number');
      expect(typeof res.body.data.reviewCount).toBe('number');
      expect(res.body.data.avgRating).toBeGreaterThanOrEqual(0);
      expect(res.body.data.reviewCount).toBeGreaterThanOrEqual(0);
    });
  });
});
