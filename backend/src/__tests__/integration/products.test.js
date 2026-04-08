import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// Mock Sharp so image processing always succeeds without a real image buffer.
// This avoids dependency on a valid JPEG in tests; Sharp is unit-tested separately.
jest.mock('sharp', () => {
  const mockInstance = {
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-processed-image')),
  };
  // sharp() returns the same mock instance
  const sharpMock = jest.fn(() => mockInstance);
  return sharpMock;
});

// ─── Test data helpers ────────────────────────────────────────────────────────

const SHOP_OWNER_ID  = '550e8400-e29b-41d4-a716-446655440010';
const SHOP_ID        = '550e8400-e29b-41d4-a716-446655440020';
const OTHER_SHOP_ID  = '550e8400-e29b-41d4-a716-446655440040';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440030';

/**
 * Build a minimal valid product DB row returned by Supabase after insert.
 */
const makeProductRow = (overrides = {}) => ({
  id: uuidv4(),
  shop_id: SHOP_ID,
  name: 'Test Product',
  description: 'A test product description',
  category: 'grocery',
  price: 2500,
  stock_quantity: 10,
  unit: 'piece',
  is_available: true,
  image_url: null,
  thumbnail_url: null,
  deleted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Build a small PNG-like buffer. Sharp is mocked so content doesn't matter —
 * only the MIME type matters for the multer fileFilter.
 */
const makeImageBuffer = () => Buffer.from('fake-image-bytes-for-testing');

/**
 * Build a valid CSV buffer with the given rows.
 */
const makeCsvBuffer = (rows) => {
  const header = 'name,description,category,price_paise,stock_quantity,unit\n';
  const body = rows.map(r =>
    `${r.name},${r.description ?? ''},${r.category},${r.price_paise},${r.stock_quantity},${r.unit}`
  ).join('\n');
  return Buffer.from(header + body, 'utf8');
};

const validCsvRow = () => ({
  name: 'Fresh Tomatoes',
  description: 'Organic tomatoes',
  category: 'vegetable',
  price_paise: 3000,
  stock_quantity: 50,
  unit: 'kg',
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('Products Routes', () => {
  let ownerToken;
  let otherOwnerToken;
  let customerToken;
  let mockSupabase;
  let mockR2;
  let mockTypesenseQueue;

  beforeAll(async () => {
    const { supabase } = await import('../../services/supabase.js');
    mockSupabase = supabase;

    const r2 = await import('../../services/r2.js');
    mockR2 = r2;

    const ts = await import('../../jobs/typesenseSync.js');
    mockTypesenseQueue = ts.typesenseSyncQueue;

    ownerToken = generateToken({
      userId: SHOP_OWNER_ID,
      phone: '9000000001',
      role: 'shop_owner',
      shopId: SHOP_ID,
    });

    otherOwnerToken = generateToken({
      userId: OTHER_OWNER_ID,
      phone: '9000000002',
      role: 'shop_owner',
      shopId: OTHER_SHOP_ID,
    });

    customerToken = generateToken({
      userId: uuidv4(),
      phone: '9000000003',
      role: 'customer',
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Mock helpers ─────────────────────────────────────────────────────────

  /**
   * Configure supabase so the shops table always returns the given owner for
   * ownership checks (both shopOwnerGuard and ProductService._verifyOwnership).
   */
  const mockShopOwnershipCheck = (shopId, ownerId) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: shopId, owner_id: ownerId },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  /**
   * Configure supabase for a full product create flow:
   *   shops → ownership check succeeds
   *   products → insert returns the given row
   */
  const mockProductCreate = (productRow) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: SHOP_ID, owner_id: SHOP_OWNER_ID },
            error: null,
          }),
        };
      }
      if (table === 'products') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: productRow, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  /**
   * Configure supabase for a bulk insert flow:
   *   shops → ownership check succeeds
   *   products → insert().select() returns the given rows array
   */
  const mockBulkProductCreate = (productRows) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: SHOP_ID, owner_id: SHOP_OWNER_ID },
            error: null,
          }),
        };
      }
      if (table === 'products') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({ data: productRows, error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  const mockProductUpdate = ({ existingProduct, updatedProduct, shopOwnerId = SHOP_OWNER_ID }) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') {
        let updateMode = false;
        const chain = {
          select: jest.fn().mockReturnThis(),
          update: jest.fn(() => {
            updateMode = true;
            return chain;
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(async () => {
            if (updateMode) {
              return {
                data: updatedProduct,
                error: updatedProduct ? null : { message: 'Update failed' },
              };
            }

            return {
              data: existingProduct,
              error: existingProduct ? null : { code: 'PGRST116', message: 'No rows found' },
            };
          }),
        };
        return chain;
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: existingProduct?.shop_id ?? SHOP_ID, owner_id: shopOwnerId },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  const mockProductDelete = ({ existingProduct, shopOwnerId = SHOP_OWNER_ID, deleteError = null }) => {
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'products') {
        let updateMode = false;
        const chain = {
          select: jest.fn().mockReturnThis(),
          update: jest.fn(() => {
            updateMode = true;
            return chain;
          }),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(async () => {
            if (updateMode) {
              return {
                data: deleteError ? null : { ...existingProduct, deleted_at: new Date().toISOString() },
                error: deleteError,
              };
            }

            return {
              data: existingProduct,
              error: existingProduct ? null : { code: 'PGRST116', message: 'No rows found' },
            };
          }),
        };
        return chain;
      }
      if (table === 'shops') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: existingProduct?.shop_id ?? SHOP_ID, owner_id: shopOwnerId },
            error: null,
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 2.5 — POST /api/v1/shops/:shopId/products
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/v1/shops/:shopId/products (Task 2.5)', () => {

    // Test 1: Valid product, no image → 201, imageUrl null
    it('creates a product without image and returns 201 with imageUrl null', async () => {
      const row = makeProductRow({ image_url: null, thumbnail_url: null });
      mockProductCreate(row);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Fresh Spinach')
        .field('category', 'vegetable')
        .field('price', '1500')
        .field('stock_quantity', '20')
        .field('unit', 'kg');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imageUrl).toBeNull();
      expect(res.body.data.thumbnailUrl).toBeNull();
      expect(res.body.data.shopId).toBe(SHOP_ID);
    });

    // Test 2: Valid product with JPEG buffer → 201, imageUrl/thumbnailUrl non-null
    it('creates a product with JPEG image and returns 201 with image URLs containing /products/', async () => {
      const productId = uuidv4();
      const row = makeProductRow({
        id: productId,
        image_url: `https://pub.nearby.app/products/${SHOP_ID}/${productId}-full.jpg`,
        thumbnail_url: `https://pub.nearby.app/products/${SHOP_ID}/${productId}-thumb.jpg`,
      });
      mockProductCreate(row);
      mockR2.uploadFile.mockResolvedValue({ ETag: '"abc"' });

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Fresh Tomatoes')
        .field('category', 'vegetable')
        .field('price', '3000')
        .field('stock_quantity', '50')
        .field('unit', 'kg')
        .attach('image', makeImageBuffer(), { filename: 'tomato.jpg', contentType: 'image/jpeg' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imageUrl).toContain('/products/');
      expect(res.body.data.thumbnailUrl).toContain('/products/');
    });

    // Test 3: Price = 0 → 400 VALIDATION_ERROR
    it('rejects price = 0 with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Invalid Product')
        .field('category', 'grocery')
        .field('price', '0')
        .field('stock_quantity', '10')
        .field('unit', 'piece');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 4: Price = "10.5" decimal → 400 VALIDATION_ERROR
    it('rejects decimal price "10.5" with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Invalid Product')
        .field('category', 'grocery')
        .field('price', '10.5')
        .field('stock_quantity', '10')
        .field('unit', 'piece');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 5: Invalid category → 400 VALIDATION_ERROR
    it('rejects invalid category with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Test Product')
        .field('category', 'invalid_category')
        .field('price', '1000')
        .field('stock_quantity', '5')
        .field('unit', 'piece');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 6: Wrong shop owner → 403
    it('returns 403 when a shop owner submits for a shop they do not own', async () => {
      // otherOwnerToken has shopId = OTHER_SHOP_ID; we call SHOP_ID → middleware blocks
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .field('name', 'Test Product')
        .field('category', 'grocery')
        .field('price', '1000')
        .field('stock_quantity', '5')
        .field('unit', 'piece');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // Test 7: No auth → 401
    it('returns 401 when no authorization header is provided', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .field('name', 'Test Product')
        .field('category', 'grocery')
        .field('price', '1000')
        .field('stock_quantity', '5')
        .field('unit', 'piece');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    // Test 8: PDF file uploaded as image → 400 INVALID_FILE_TYPE
    it('rejects PDF file in the image field with 400 INVALID_FILE_TYPE', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Test Product')
        .field('category', 'grocery')
        .field('price', '1000')
        .field('stock_quantity', '5')
        .field('unit', 'piece')
        .attach('image', Buffer.from('%PDF-1.4 fake content'), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    // Test 9: stock_quantity = 0 → 201 (valid)
    it('accepts stock_quantity = 0 and returns 201', async () => {
      const row = makeProductRow({ stock_quantity: 0 });
      mockProductCreate(row);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Out of Stock Item')
        .field('category', 'grocery')
        .field('price', '5000')
        .field('stock_quantity', '0')
        .field('unit', 'piece');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stockQuantity).toBe(0);
    });

    // Test 10: Typesense job queued after creation
    it('queues a product_sync Typesense job after successful product creation', async () => {
      const row = makeProductRow();
      mockProductCreate(row);

      await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('name', 'Queue Test Product')
        .field('category', 'grocery')
        .field('price', '1000')
        .field('stock_quantity', '5')
        .field('unit', 'piece');

      expect(mockTypesenseQueue.add).toHaveBeenCalledWith(
        'product_sync',
        expect.objectContaining({ action: 'product_sync' })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Task 2.6 — POST /api/v1/shops/:shopId/products/bulk
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/v1/shops/:shopId/products/bulk (Task 2.6)', () => {
    it('returns 401 when no authorization header is provided for bulk upload', async () => {
      const csvBuf = makeCsvBuffer([validCsvRow()]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when a customer attempts bulk upload', async () => {
      const csvBuf = makeCsvBuffer([validCsvRow()]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    // Test 1: Valid 3-row CSV all valid → 201, created:3, failed:0
    it('bulk creates 3 valid products and returns 201 with created:3 failed:0', async () => {
      const rows = [makeProductRow(), makeProductRow(), makeProductRow()];
      mockBulkProductCreate(rows);

      const csvBuf = makeCsvBuffer([validCsvRow(), validCsvRow(), validCsvRow()]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBe(3);
      expect(res.body.data.failed).toBe(0);
      expect(res.body.data.errors).toHaveLength(0);
    });

    it('still returns 201 when Typesense queueing fails after bulk insert', async () => {
      const rows = [makeProductRow(), makeProductRow()];
      mockBulkProductCreate(rows);
      mockTypesenseQueue.add.mockRejectedValue(new Error('queue unavailable'));

      const csvBuf = makeCsvBuffer([validCsvRow(), validCsvRow()]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBe(2);
      expect(res.body.data.failed).toBe(0);
    });

    // Test 2: 3-row CSV, row 2 has invalid category → 207, created:2, failed:1
    it('returns 207 when one of three CSV rows has an invalid category', async () => {
      const rows = [makeProductRow(), makeProductRow()];
      mockBulkProductCreate(rows);

      const csvBuf = makeCsvBuffer([
        validCsvRow(),
        { ...validCsvRow(), category: 'INVALID_CAT' },
        validCsvRow(),
      ]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(207);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBe(2);
      expect(res.body.data.failed).toBe(1);
      expect(res.body.data.errors).toHaveLength(1);
      expect(res.body.data.errors[0].row).toBe(2);
    });

    // Test 3: 101-row CSV → 400 before any insert
    it('rejects CSV with 101 rows before attempting any DB insert', async () => {
      const tooManyRows = Array.from({ length: 101 }, (_, i) => ({
        ...validCsvRow(),
        name: `Product ${i + 1}`,
      }));
      const csvBuf = makeCsvBuffer(tooManyRows);

      // Mock ownership so the limit check is reached
      mockShopOwnershipCheck(SHOP_ID, SHOP_OWNER_ID);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 4: No file → 400 VALIDATION_ERROR
    it('returns 400 VALIDATION_ERROR when no CSV file is uploaded', async () => {
      // Satisfy shopOwnerGuard ownership check
      mockShopOwnershipCheck(SHOP_ID, SHOP_OWNER_ID);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        // Send multipart body with a text field only (no file)
        .field('_placeholder', '1');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 5: Wrong MIME (image/jpeg file) → 400 INVALID_FILE_TYPE
    it('rejects a JPEG file uploaded in the csv field with 400 INVALID_FILE_TYPE', async () => {
      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', makeImageBuffer(), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects a CSV larger than 2 MB with 413 FILE_TOO_LARGE', async () => {
      const largeCsv = Buffer.alloc((2 * 1024 * 1024) + 1, 'a');

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', largeCsv, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(413);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
    });

    // Test 6: CSV missing 'unit' column → 400 VALIDATION_ERROR
    it('rejects CSV missing required "unit" column with 400 VALIDATION_ERROR', async () => {
      mockShopOwnershipCheck(SHOP_ID, SHOP_OWNER_ID);

      // CSV without the 'unit' column
      const csvBuf = Buffer.from(
        'name,description,category,price_paise,stock_quantity\n' +
        'Product A,Desc,grocery,1000,10\n'
      );

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('unit');
    });

    // Test 7: All rows fail validation → 400 VALIDATION_ERROR, created:0
    it('returns 400 VALIDATION_ERROR when all CSV rows are invalid', async () => {
      mockShopOwnershipCheck(SHOP_ID, SHOP_OWNER_ID);

      const csvBuf = makeCsvBuffer([
        { ...validCsvRow(), category: 'BAD_CAT_1' },
        { ...validCsvRow(), category: 'BAD_CAT_2' },
      ]);

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 8: Empty CSV (header only) → 400 VALIDATION_ERROR
    it('returns 400 VALIDATION_ERROR for a CSV that contains only a header row', async () => {
      mockShopOwnershipCheck(SHOP_ID, SHOP_OWNER_ID);

      const csvBuf = Buffer.from(
        'name,description,category,price_paise,stock_quantity,unit\n'
      );

      const res = await request(app)
        .post(`/api/v1/shops/${SHOP_ID}/products/bulk`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('csv', csvBuf, { filename: 'products.csv', contentType: 'text/csv' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/products/:productId (Task 2.7)', () => {
    it('updates stock_quantity and returns 200 with the updated product', async () => {
      const existingProduct = makeProductRow({ stock_quantity: 10 });
      const updatedProduct = { ...existingProduct, stock_quantity: 0 };
      mockProductUpdate({ existingProduct, updatedProduct });

      const res = await request(app)
        .patch(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ stock_quantity: 0 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stockQuantity).toBe(0);
    });

    it('updates price and returns 200 with the updated value', async () => {
      const existingProduct = makeProductRow({ price: 2500 });
      const updatedProduct = { ...existingProduct, price: 3500 };
      mockProductUpdate({ existingProduct, updatedProduct });

      const res = await request(app)
        .patch(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price: 3500 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(3500);
    });

    it('returns 404 for a non-existent product id', async () => {
      mockProductUpdate({ existingProduct: null, updatedProduct: null });

      const res = await request(app)
        .patch(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price: 3500 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('returns 403 when a shop owner updates another owner product', async () => {
      const existingProduct = makeProductRow();
      const updatedProduct = { ...existingProduct, price: 3500 };
      mockProductUpdate({
        existingProduct,
        updatedProduct,
        shopOwnerId: OTHER_OWNER_ID,
      });

      const res = await request(app)
        .patch(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price: 3500 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when no authorization header is provided', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${uuidv4()}`)
        .send({ stock_quantity: 5 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when a customer attempts to update a product', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ stock_quantity: 5 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('queues a product_sync Typesense job after update', async () => {
      const existingProduct = makeProductRow({ price: 2500 });
      const updatedProduct = { ...existingProduct, price: 4200 };
      mockProductUpdate({ existingProduct, updatedProduct });

      const res = await request(app)
        .patch(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ price: 4200 });

      expect(res.status).toBe(200);
      expect(mockTypesenseQueue.add).toHaveBeenCalledWith(
        'product_sync',
        expect.objectContaining({
          action: 'product_sync',
          productId: existingProduct.id,
        })
      );
    });
  });

  describe('GET /api/v1/products/template (Task 3.1)', () => {
    it('returns a downloadable CSV template for a shop owner', async () => {
      const res = await request(app)
        .get('/api/v1/products/template')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('nearby-products-template.csv');
      expect(res.text).toContain('name,description,category,price_paise,stock_quantity,unit');
    });

    it('returns a category-prefilled template when category is provided', async () => {
      const res = await request(app)
        .get('/api/v1/products/template')
        .query({ category: 'vegetable' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toContain('nearby-products-template-vegetable.csv');
      expect(res.text).toContain('"Fresh Tomatoes"');
      expect(res.text).toContain('"vegetable"');
    });

    it('returns 400 for an invalid category', async () => {
      const res = await request(app)
        .get('/api/v1/products/template')
        .query({ category: 'invalid_category' })
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 when no authorization header is provided', async () => {
      const res = await request(app)
        .get('/api/v1/products/template');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when a customer requests the template', async () => {
      const res = await request(app)
        .get('/api/v1/products/template')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/products/:productId (Task 2.8)', () => {
    it('soft deletes a product and returns 204', async () => {
      const existingProduct = makeProductRow();
      mockProductDelete({ existingProduct });

      const res = await request(app)
        .delete(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });

    it('queues a product_remove Typesense job after delete', async () => {
      const existingProduct = makeProductRow();
      mockProductDelete({ existingProduct });

      await request(app)
        .delete(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(mockTypesenseQueue.add).toHaveBeenCalledWith(
        'product_remove',
        expect.objectContaining({
          action: 'product_remove',
          productId: existingProduct.id,
        })
      );
    });

    it('returns 404 for a non-existent product id', async () => {
      mockProductDelete({ existingProduct: null });

      const res = await request(app)
        .delete(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('returns 403 when a shop owner deletes another owner product', async () => {
      const existingProduct = makeProductRow();
      mockProductDelete({
        existingProduct,
        shopOwnerId: OTHER_OWNER_ID,
      });

      const res = await request(app)
        .delete(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when no authorization header is provided', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${uuidv4()}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when a customer attempts to delete a product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 404 when the product is already soft deleted', async () => {
      const existingProduct = makeProductRow({
        deleted_at: new Date().toISOString(),
      });
      mockProductDelete({ existingProduct });

      const res = await request(app)
        .delete(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('still returns 204 when Typesense remove queueing fails', async () => {
      const existingProduct = makeProductRow();
      mockProductDelete({ existingProduct });
      mockTypesenseQueue.add.mockRejectedValue(new Error('queue unavailable'));

      const res = await request(app)
        .delete(`/api/v1/products/${existingProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(204);
    });
  });
});
