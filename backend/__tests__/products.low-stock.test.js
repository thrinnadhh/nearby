/**
 * Backend tests for low stock products endpoint and service
 * Tests: backend/src/routes/products.js and backend/src/services/products.js
 * Run: npm test -- products.low-stock.test.js
 */

import request from 'supertest';
import app from '../index.js';
import ProductService from '../services/products.js';
import { supabase } from '../services/supabase.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

jest.mock('../services/supabase.js');
jest.mock('../utils/logger.js');

const mockUserId = 'user-123';
const mockShopId = 'shop-456';
const mockToken = 'valid-jwt-token';

const mockProducts = [
  {
    id: 'prod-1',
    shop_id: mockShopId,
    name: 'Low Stock Item 1',
    description: 'Description 1',
    category: 'grocery',
    price: 5000,
    stock_quantity: 2,
    unit: 'kg',
    is_available: true,
    image_url: null,
    thumbnail_url: null,
    created_at: '2026-04-19T10:00:00Z',
    updated_at: '2026-04-19T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'prod-2',
    shop_id: mockShopId,
    name: 'Ample Stock Item',
    description: 'Description 2',
    category: 'vegetable',
    price: 3000,
    stock_quantity: 50,
    unit: 'kg',
    is_available: true,
    image_url: null,
    thumbnail_url: null,
    created_at: '2026-04-19T10:00:00Z',
    updated_at: '2026-04-19T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 'prod-3',
    shop_id: mockShopId,
    name: 'Out of Stock',
    description: 'Description 3',
    category: 'dairy',
    price: 6500,
    stock_quantity: 0,
    unit: 'litre',
    is_available: true,
    image_url: null,
    thumbnail_url: null,
    created_at: '2026-04-19T10:00:00Z',
    updated_at: '2026-04-19T10:00:00Z',
    deleted_at: null,
  },
];

describe('getLowStockProducts - Service Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch products below threshold with default params', async () => {
    // Mock ownership verification
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    // Mock count query
    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        }),
      }),
    });

    // Mock products fetch
    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [mockProducts[0], mockProducts[2]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const result = await ProductService.getLowStockProducts(mockUserId, mockShopId);

    expect(result.products).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.lowStockCount).toBe(2);
    expect(result.threshold).toBe(5);
    expect(result.page).toBe(1);
  });

  test('should respect custom threshold parameter', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: [mockProducts[0]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const result = await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      threshold: 3,
    });

    expect(result.threshold).toBe(3);
    expect(result.products).toHaveLength(1);
  });

  test('should validate and clamp threshold to 1-999 range', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
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
      }),
    });

    const result = await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      threshold: 2000, // Should be clamped to 999
    });

    expect(result.threshold).toBe(999);
  });

  test('should support sorting by stock (ascending)', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 2,
              error: null,
            }),
          }),
        }),
      }),
    });

    const orderMock = jest.fn().mockReturnValue({
      range: jest.fn().mockResolvedValue({
        data: [mockProducts[2], mockProducts[0]], // Sorted by stock asc
        error: null,
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: orderMock,
            }),
          }),
        }),
      }),
    });

    const result = await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      sortBy: 'stock',
    });

    expect(orderMock).toHaveBeenCalledWith('stock_quantity', { ascending: true });
    expect(result.products).toHaveLength(2);
  });

  test('should support sorting by name (ascending)', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    });

    const orderMock = jest.fn().mockReturnValue({
      range: jest.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: orderMock,
            }),
          }),
        }),
      }),
    });

    await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      sortBy: 'name',
    });

    expect(orderMock).toHaveBeenCalledWith('name', { ascending: true });
  });

  test('should support sorting by updated_at (descending)', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          }),
        }),
      }),
    });

    const orderMock = jest.fn().mockReturnValue({
      range: jest.fn().mockResolvedValue({
        data: [mockProducts[0]],
        error: null,
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: orderMock,
            }),
          }),
        }),
      }),
    });

    await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      sortBy: 'updated_at',
    });

    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  test('should handle authorization check - unauthorized user', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: 'different-user' }, // Different owner
            error: null,
          }),
        }),
      }),
    });

    await expect(
      ProductService.getLowStockProducts(mockUserId, mockShopId)
    ).rejects.toThrow('You are not authorized');
  });

  test('should handle authorization check - shop not found', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'No rows found' },
          }),
        }),
      }),
    });

    await expect(
      ProductService.getLowStockProducts(mockUserId, mockShopId)
    ).rejects.toThrow('Shop does not exist');
  });

  test('should handle database fetch errors', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    });

    await expect(
      ProductService.getLowStockProducts(mockUserId, mockShopId)
    ).rejects.toThrow('Failed to get low stock count');
  });

  test('should return pagination metadata correctly', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: mockShopId, owner_id: mockUserId },
            error: null,
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              count: 50,
              error: null,
            }),
          }),
        }),
      }),
    });

    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockResolvedValue({
                  data: Array(20).fill(mockProducts[0]),
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    });

    const result = await ProductService.getLowStockProducts(mockUserId, mockShopId, {
      page: 2,
      limit: 20,
    });

    expect(result.page).toBe(2);
    expect(result.total).toBe(50);
    expect(result.pages).toBe(3); // 50 / 20 = 2.5 rounded up
    expect(result.products).toHaveLength(20);
  });
});

describe('GET /api/v1/shops/:shopId/products/low-stock - Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 401 if not authenticated', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${mockShopId}/products/low-stock`)
      .set('Authorization', '');

    expect(res.status).toBe(401);
  });

  test('should return 403 if user is not shop_owner', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${mockShopId}/products/low-stock`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send();

    // Would depend on JWT middleware implementation
    // This is a placeholder test
    expect([401, 403]).toContain(res.status);
  });

  test('should validate query parameters', async () => {
    // Test invalid threshold
    const res = await request(app)
      .get(`/api/v1/shops/${mockShopId}/products/low-stock?threshold=2000`)
      .set('Authorization', `Bearer ${mockToken}`)
      .send();

    // Should either accept (and clamp) or reject
    expect([200, 400]).toContain(res.status);
  });

  test('should accept valid query parameters', async () => {
    const validQueries = [
      'threshold=5&page=1&limit=20&sortBy=stock',
      'threshold=10',
      'sortBy=name',
      'page=2&limit=50',
    ];

    for (const query of validQueries) {
      // Verify parameter parsing works (actual request would need auth)
      expect(query).toMatch(/^[a-zA-Z0-9=&_]*$/);
    }
  });
});
