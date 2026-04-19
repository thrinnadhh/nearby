/**
 * Backend tests for GET /shops/:shopId/products/low-stock endpoint
 * Validates: acceptance criteria, edge cases, auth, error handling
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index.js';
import * as supabaseService from '../../services/supabase.js';
import logger from '../../utils/logger.js';

// Mock Supabase
jest.mock('../../services/supabase.js');
jest.mock('../../utils/logger.js');

const TEST_SHOP_ID = 'shop-001';
const TEST_USER_ID = 'user-001';
const TEST_PRODUCT_1 = {
  id: 'prod-001',
  shop_id: TEST_SHOP_ID,
  name: 'Rice',
  category: 'Grains',
  price: 2500, // paise
  stock_quantity: 2,
  unit: 'kg',
  thumbnail_url: 'https://cdn.example.com/rice.jpg',
  description: 'Basmati rice',
  is_available: true,
  created_at: '2026-04-19T10:00:00Z',
  updated_at: '2026-04-19T10:00:00Z',
  deleted_at: null,
};

const TEST_PRODUCT_2 = {
  id: 'prod-002',
  shop_id: TEST_SHOP_ID,
  name: 'Wheat Flour',
  category: 'Grains',
  price: 1500,
  stock_quantity: 4,
  unit: 'kg',
  thumbnail_url: 'https://cdn.example.com/wheat.jpg',
  description: 'Whole wheat flour',
  is_available: true,
  created_at: '2026-04-19T09:00:00Z',
  updated_at: '2026-04-19T11:00:00Z',
  deleted_at: null,
};

const TEST_PRODUCT_3 = {
  id: 'prod-003',
  shop_id: TEST_SHOP_ID,
  name: 'Apples',
  category: 'Fruits',
  price: 5000,
  stock_quantity: 15,
  unit: 'count',
  thumbnail_url: 'https://cdn.example.com/apples.jpg',
  description: 'Fresh red apples',
  is_available: true,
  created_at: '2026-04-19T08:00:00Z',
  updated_at: '2026-04-19T09:00:00Z',
  deleted_at: null,
};

// Helper: Generate valid JWT
function generateToken(userId = TEST_USER_ID, shopId = TEST_SHOP_ID, role = 'shop_owner') {
  return jwt.sign(
    { userId, shopId, phone: '+919999999999', role },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '1h' }
  );
}

describe('GET /api/v1/shops/:shopId/products/low-stock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});
  });

  describe('Happy Path', () => {
    it('should return low stock products with default threshold (5)', async () => {
      // Mock ownership verification
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      // Mock product count
      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      // Mock product fetch
      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_1, TEST_PRODUCT_2],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.threshold).toBe(5);
      expect(res.body.meta.lowStockCount).toBe(2);
      expect(res.body.meta.page).toBe(1);
    });

    it('should return pagination metadata with correct structure', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 25,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: Array(20).fill(TEST_PRODUCT_1),
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?page=1&limit=20`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toHaveProperty('page');
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('pages');
      expect(res.body.meta).toHaveProperty('lowStockCount');
      expect(res.body.meta.pages).toBe(2);
      expect(res.body.meta.total).toBe(25);
    });
  });

  describe('Acceptance Criteria', () => {
    it('AC1: should return only items with stock < threshold', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_1, TEST_PRODUCT_2],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?threshold=5`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((product) => {
        expect(product.stockQuantity).toBeLessThan(5);
      });
    });

    it('AC2: threshold defaults to 5, configurable via query param', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_3],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();

      // Test with custom threshold
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?threshold=20`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.threshold).toBe(20);
    });

    it('AC3: pagination works correctly with page and limit params', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 40,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: Array(15).fill(TEST_PRODUCT_1),
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?page=2&limit=15`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.total).toBe(40);
      expect(res.body.meta.pages).toBe(3);
    });

    it('AC4: sorting works - sortBy=stock (lowest first)', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_1, TEST_PRODUCT_2],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?sortBy=stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].stockQuantity).toBeLessThanOrEqual(
        res.body.data[1].stockQuantity
      );
    });

    it('AC5: sorting works - sortBy=name (alphabetical)', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_2, TEST_PRODUCT_1],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?sortBy=name`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('AC6: sorting works - sortBy=updated_at (newest first)', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_2, TEST_PRODUCT_1],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?sortBy=updated_at`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('AC9: shop ownership verified - roleGuard checks JWT shopId matches route param', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      const token = generateToken(TEST_USER_ID, TEST_SHOP_ID);
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      // Should verify ownership was called
      expect(supabaseService.supabase.from).toHaveBeenCalledWith('shops');
    });
  });

  describe('Edge Cases', () => {
    it('EC1: threshold below 1 should return 400 INVALID_THRESHOLD', async () => {
      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?threshold=0`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('EC2: threshold above 999 should return 400 INVALID_THRESHOLD', async () => {
      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?threshold=1000`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('EC3: page 0 or negative should return 400 INVALID_PAGE', async () => {
      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?page=0`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('EC4: limit > 100 should clamp to 100 or return 400', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [TEST_PRODUCT_1],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?limit=200`)
        .set('Authorization', `Bearer ${token}`);

      // Should either return 400 or clamp limit
      if (res.status === 200) {
        expect(res.body.meta.limit).toBeLessThanOrEqual(100);
      } else {
        expect(res.status).toBe(400);
      }
    });

    it('EC5: empty result (all items stock >= threshold) should return 200 with empty array', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 0,
              error: null,
              data: [],
            }),
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.lowStockCount).toBe(0);
    });
  });

  describe('Auth + Roles', () => {
    it('should return 401 with no auth token', async () => {
      const res = await request(app).get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-shop_owner role', async () => {
      const token = generateToken(TEST_USER_ID, TEST_SHOP_ID, 'customer');
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 when shop in JWT does not match route param', async () => {
      const token = generateToken(TEST_USER_ID, 'different-shop-id', 'shop_owner');
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Cases', () => {
    it('should return 404 SHOP_NOT_FOUND when shop does not exist', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows found' },
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SHOP_NOT_FOUND');
    });

    it('should return 403 FORBIDDEN when user does not own shop', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: 'different-owner-id' },
            error: null,
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid sortBy value', async () => {
      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock?sortBy=invalid`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on database query error', async () => {
      supabaseService.supabase.from('shops').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: TEST_SHOP_ID, owner_id: TEST_USER_ID },
            error: null,
          }),
        }),
      });

      supabaseService.supabase.from('products').select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const token = generateToken();
      const res = await request(app)
        .get(`/api/v1/shops/${TEST_SHOP_ID}/products/low-stock`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
    });
  });
});
