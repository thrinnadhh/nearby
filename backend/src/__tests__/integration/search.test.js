import request from 'supertest';
import { app } from '../../index.js';

const mockShopSearch = jest.fn();
const mockProductSearch = jest.fn();

jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
  },
}));

jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
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

jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
  typesenseSyncWorker: {},
}));

jest.mock('../../services/typesense.js', () => {
  const collections = Object.assign(
    jest.fn((collectionName) => ({
      documents: jest.fn(() => ({
        search: collectionName === 'products' ? mockProductSearch : mockShopSearch,
      })),
    })),
    {
      retrieve: jest.fn().mockResolvedValue([]),
    }
  );

  return {
    typesense: {
      collections,
    },
  };
});

describe('Search Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nearby shops for a valid geo search query', async () => {
    mockShopSearch.mockResolvedValue({
      found: 1,
      page: 1,
      hits: [
        {
          document: {
            id: 'shop-1',
            name: 'Raju Kirana',
            category: 'kirana',
            description: 'Neighborhood grocery store',
            latitude: 17.385,
            longitude: 78.4867,
            is_open: true,
            is_verified: true,
            trust_score: 87.5,
          },
          geo_distance_meters: {
            geo_location: 425,
          },
        },
      ],
    });

    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lat: 17.385, lng: 78.4867, radius_km: 3, category: 'kirana', open_only: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: 'shop-1',
        name: 'Raju Kirana',
        category: 'kirana',
        isOpen: true,
        isVerified: true,
        trustScore: 87.5,
        distanceMeters: 425,
      })
    );
    expect(res.body.meta).toEqual(
      expect.objectContaining({
        found: 1,
        page: 1,
        limit: 20,
      })
    );
    expect(mockShopSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: '*',
        filter_by: 'geo_location:(17.385, 78.4867, 3km) && category:=kirana && is_open:=true',
        page: 1,
        per_page: 20,
      })
    );
  });

  it('uses defaults when optional filters are omitted', async () => {
    mockShopSearch.mockResolvedValue({
      found: 0,
      page: 1,
      hits: [],
    });

    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lat: 17.385, lng: 78.4867 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(mockShopSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filter_by: 'geo_location:(17.385, 78.4867, 3km)',
        per_page: 20,
      })
    );
  });

  it('returns 400 when lat is missing', async () => {
    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lng: 78.4867 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lat: 17.385, lng: 78.4867, category: 'invalid_category' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when radius_km exceeds the allowed max', async () => {
    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lat: 17.385, lng: 78.4867, radius_km: 25 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when the Typesense search fails', async () => {
    mockShopSearch.mockRejectedValue(new Error('typesense unavailable'));

    const res = await request(app)
      .get('/api/v1/search/shops')
      .query({ lat: 17.385, lng: 78.4867 });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns products for a valid cross-shop product search query', async () => {
    mockProductSearch.mockResolvedValue({
      found: 1,
      page: 1,
      hits: [
        {
          document: {
            id: 'product-1',
            shop_id: '550e8400-e29b-41d4-a716-446655440020',
            name: 'Fresh Milk',
            description: 'Full cream milk',
            category: 'dairy',
            price: 6500,
            stock_quantity: 20,
            unit: 'litre',
            is_available: true,
            image_url: 'https://pub.nearby.app/products/shop/milk.jpg',
            thumbnail_url: 'https://pub.nearby.app/products/shop/milk-thumb.jpg',
          },
        },
      ],
    });

    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ q: 'mlik', category: 'dairy', shop_id: '550e8400-e29b-41d4-a716-446655440020' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: 'product-1',
        shopId: '550e8400-e29b-41d4-a716-446655440020',
        name: 'Fresh Milk',
        category: 'dairy',
        price: 6500,
        stockQuantity: 20,
        unit: 'litre',
        isAvailable: true,
      })
    );
    expect(mockProductSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'mlik',
        filter_by: 'is_available:=true && category:=dairy && shop_id:=550e8400-e29b-41d4-a716-446655440020',
        typo_tokens_threshold: 1,
        prefix: true,
      })
    );
  });

  it('uses default product-search filters when optional params are omitted', async () => {
    mockProductSearch.mockResolvedValue({
      found: 0,
      page: 1,
      hits: [],
    });

    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ q: 'milk' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(mockProductSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'milk',
        filter_by: 'is_available:=true',
        per_page: 20,
      })
    );
  });

  it('returns 400 when q is missing for product search', async () => {
    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ category: 'dairy' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when product search category is invalid', async () => {
    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ q: 'milk', category: 'invalid_category' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when shop_id is not a valid UUID', async () => {
    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ q: 'milk', shop_id: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 500 when the product search backend fails', async () => {
    mockProductSearch.mockRejectedValue(new Error('typesense unavailable'));

    const res = await request(app)
      .get('/api/v1/search/products')
      .query({ q: 'milk' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
