import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

// Mock Redis service
jest.mock('../../services/redis.js', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    call: jest.fn().mockResolvedValue(null),
  },
}));

// Mock Supabase service
jest.mock('../../services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock R2 service
jest.mock('../../services/r2.js', () => ({
  uploadFile: jest.fn().mockResolvedValue({ ETag: '"test-etag"' }),
  getSignedFileUrl: jest.fn().mockResolvedValue(
    'https://example.r2.cloudflarestorage.com/signed-url?expires=123456789'
  ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
}));

describe('Shops Routes', () => {
  let shopOwnerToken;
  let shopOwnerTokenWithShop;
  let customerToken;
  let shopOwnerId;
  let customerId;
  let shopId;
  let mockSupabase;
  let mockR2;
  let mockRedis;

  beforeAll(async () => {
    // Get the mocked supabase instance
    const { supabase } = await import('../../services/supabase.js');
    mockSupabase = supabase;

    // Get the mocked R2 service
    const r2Service = await import('../../services/r2.js');
    mockR2 = r2Service;

    // Get the mocked Redis service
    const redisService = await import('../../services/redis.js');
    mockRedis = redisService.redis;

    // Create test shop owner user ID
    shopOwnerId = '550e8400-e29b-41d4-a716-446655440001';
    shopOwnerToken = generateToken({
      userId: shopOwnerId,
      phone: '+919999999999',
      role: 'shop_owner',
    });

    // Create token with shopId for KYC tests
    shopId = uuidv4();
    shopOwnerTokenWithShop = generateToken({
      userId: shopOwnerId,
      phone: '+919999999999',
      role: 'shop_owner',
      shopId: shopId,
    });

    // Create test customer user ID
    customerId = '550e8400-e29b-41d4-a716-446655440002';
    customerToken = generateToken({
      userId: customerId,
      phone: '+918888888888',
      role: 'customer',
    });
  });

  /**
   * Mock helper: Setup supabase.from() for profile lookup
   * Returns: profile with optional shop_id
   */
  const mockProfileSelect = (shopIdForProfile = null) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopOwnerId,
          phone: '+919999999999',
          role: 'shop_owner',
          shop_id: shopIdForProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Mock helper: Setup supabase.from() for shop insert
   * Returns: newly created shop record
   */
  const mockShopInsert = (shopIdForInsert) => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopIdForInsert,
          name: 'Fresh Kirana Store',
          category: 'kirana',
          phone: '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: 'A quality kirana store offering fresh vegetables and groceries',
          is_open: true,
          is_verified: false,
          trust_score: 50.0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Mock helper: Setup supabase.from() for profile update
   * Returns: updated profile record with shop_id
   */
  const mockProfileUpdate = (shopIdForUpdate) => {
    const chain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopOwnerId,
          phone: '+919999999999',
          role: 'shop_owner',
          shop_id: shopIdForUpdate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Mock helper: Setup supabase.from() for shop select (for shopOwnerGuard verification)
   * Returns: shop record with owner_id
   */
  const mockShopOwnershipVerification = (shopIdForOwnership, ownerId = shopOwnerId) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopIdForOwnership,
          owner_id: ownerId,
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Mock helper: Setup supabase.from() for shop select (KYC upload)
   * Returns: existing shop record
   */
  const mockShopSelect = (shopIdForSelect, ownerId = shopOwnerId) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopIdForSelect,
          owner_id: ownerId,
          name: 'Fresh Kirana Store',
          category: 'kirana',
          phone: '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: 'A quality kirana store offering fresh vegetables and groceries',
          is_open: true,
          is_verified: false,
          trust_score: 50.0,
          kyc_document_url: null,
          kyc_status: 'pending_kyc',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Mock helper: Setup supabase.from() for shop update (KYC submission)
   * Returns: updated shop record with KYC info
   */
  const mockShopUpdate = (shopIdForUpdate, kycUrl = 'https://example.r2.cloudflarestorage.com/signed-url?expires=123456789') => {
    const chain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopIdForUpdate,
          name: 'Fresh Kirana Store',
          category: 'kirana',
          phone: '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: 'A quality kirana store offering fresh vegetables and groceries',
          is_open: true,
          is_verified: false,
          trust_score: 50.0,
          kyc_document_url: kycUrl,
          kyc_document_expires_at: new Date(Date.now() + 300000).toISOString(),
          kyc_status: 'kyc_submitted',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  /**
   * Helper: Create a valid PDF Buffer for testing
   */
  const createPdfBuffer = (sizeInKb = 100) => {
    // Create a minimal valid PDF (PDF magic bytes: %PDF-1.4)
    const pdfHeader = '%PDF-1.4\n';
    const padding = 'x'.repeat(Math.max(0, sizeInKb * 1024 - pdfHeader.length));
    return Buffer.from(pdfHeader + padding);
  };

  describe('POST /api/v1/shops', () => {
    // Test 1: Valid shop creation (201, correct fields)
    it('should successfully create a shop with valid data (201)', async () => {
      const newShopId = uuidv4();
      const shopData = {
        name: 'Fresh Kirana Store',
        description: 'A quality kirana store offering fresh vegetables and groceries',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'kirana',
        phone: '+919876543210',
      };

      // Mock: checkOwnerHasShop (profile lookup returns no shop_id)
      mockSupabase.from.mockReturnValueOnce(mockProfileSelect(null));

      // Mock: shop insert
      mockSupabase.from.mockReturnValueOnce(mockShopInsert(newShopId));

      // Mock: profile update
      mockSupabase.from.mockReturnValueOnce(mockProfileUpdate(newShopId));

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.name).toBe(shopData.name);
      expect(response.body.data.category).toBe(shopData.category);
      expect(response.body.data.description).toBe(shopData.description);
      expect(response.body.data.latitude).toBe(shopData.latitude);
      expect(response.body.data.longitude).toBe(shopData.longitude);
      expect(response.body.data.phone).toBe(shopData.phone);
      expect(response.body.data.isOpen).toBe(true);
      expect(response.body.data.isVerified).toBe(false);
      expect(response.body.data.trustScore).toBe(50.0);
      expect(response.body.data.createdAt).toBeDefined();
      expect(response.body.data.updatedAt).toBeDefined();
    });

    // Test 2: Duplicate shop prevention (409 DUPLICATE_SHOP)
    it('should reject duplicate shop creation (409 DUPLICATE_SHOP)', async () => {
      const existingShopId = uuidv4();
      const shopData = {
        name: 'Second Shop Attempt',
        description: 'A second shop attempt by same owner should fail',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'pharmacy',
      };

      // Mock: checkOwnerHasShop (profile lookup returns existing shop_id)
      mockSupabase.from.mockReturnValueOnce(mockProfileSelect(existingShopId));

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DUPLICATE_SHOP');
      expect(response.body.error.message).toContain('already own a shop');
    });

    // Test 3: Role guard — customer can't create (403 FORBIDDEN)
    it('should reject customer creating shop (403 FORBIDDEN)', async () => {
      const shopData = {
        name: 'Unauthorized Shop',
        description: 'Customer should not be able to create a shop',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'kirana',
      };

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(shopData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
      expect(response.body.error.message).toContain('does not have access');
    });

    // Test 4: Invalid latitude (400 INVALID_COORDINATES)
    it('should reject invalid latitude (400 INVALID_COORDINATES)', async () => {
      const shopData = {
        name: 'Shop with Bad Latitude',
        description: 'This shop has latitude outside India bounds',
        latitude: 50.0, // Outside India bounds (should be 8-35)
        longitude: 78.4867,
        category: 'kirana',
      };

      // Mock: checkOwnerHasShop (no existing shop)
      mockSupabase.from.mockReturnValueOnce(mockProfileSelect(null));

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_COORDINATES');
    });

    // Test 5: Invalid longitude (400 INVALID_COORDINATES)
    it('should reject invalid longitude (400 INVALID_COORDINATES)', async () => {
      const shopData = {
        name: 'Shop with Bad Longitude',
        description: 'This shop has longitude outside India bounds',
        latitude: 17.3850,
        longitude: 100.0, // Outside India bounds (should be 68-97)
        category: 'kirana',
      };

      // Mock: checkOwnerHasShop (no existing shop)
      mockSupabase.from.mockReturnValueOnce(mockProfileSelect(null));

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_COORDINATES');
    });

    // Test 6: Missing required field (400 VALIDATION_ERROR)
    it('should reject missing required field (400 VALIDATION_ERROR)', async () => {
      const shopData = {
        name: 'Shop Without Description',
        // Missing description
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'kirana',
      };

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 7: Invalid category enum (400 VALIDATION_ERROR)
    it('should reject invalid category enum (400 VALIDATION_ERROR)', async () => {
      const shopData = {
        name: 'Shop with Bad Category',
        description: 'This shop has an invalid category',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'invalid_category', // Invalid category
      };

      const response = await request(app)
        .post('/api/v1/shops')
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .send(shopData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    // Test 8: Unauthenticated request (401 UNAUTHORIZED)
    it('should reject unauthenticated request (401 UNAUTHORIZED)', async () => {
      const shopData = {
        name: 'Unauthorized Shop',
        description: 'Request without authentication should fail',
        latitude: 17.3850,
        longitude: 78.4867,
        category: 'kirana',
      };

      const response = await request(app)
        .post('/api/v1/shops')
        .send(shopData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/shops/:shopId/kyc', () => {
    // Reset mocks before each KYC test (only reset call counts, not implementations)
    beforeEach(() => {
      mockSupabase.from.mockReset();
      mockRedis.get.mockReset();
      mockRedis.setex.mockReset();
      mockR2.uploadFile.mockReset();
      mockR2.getSignedFileUrl.mockReset();
      mockR2.deleteFile.mockReset();

      // Restore default behavior for mocks
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');
      mockR2.uploadFile.mockResolvedValue({ ETag: '"test-etag"' });
      mockR2.getSignedFileUrl.mockResolvedValue(
        'https://example.r2.cloudflarestorage.com/signed-url?expires=123456789'
      );
    });

    // Test 1: Valid PDF upload returns 201 with signed URL
    it('should successfully upload KYC PDF and return signed URL (201)', async () => {
      const idempotencyKey = uuidv4();

      // Mock: Redis get (idempotency check) - not cached
      mockRedis.get.mockResolvedValueOnce(null);

      // Mock: shopOwnerGuard shop ownership verification
      mockSupabase.from.mockReturnValueOnce(mockShopOwnershipVerification(shopId));

      // Mock: shop select (shop exists check)
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(shopId));

      // Mock: shop update (KYC submission)
      mockSupabase.from.mockReturnValueOnce(mockShopUpdate(shopId));

      // Mock: Redis setex (cache result)
      mockRedis.setex.mockResolvedValueOnce('OK');

      const pdfBuffer = createPdfBuffer(100);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('Authorization', `Bearer ${shopOwnerTokenWithShop}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', pdfBuffer, 'kyc.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.shopId).toBe(shopId);
      expect(response.body.data.kycDocumentUrl).toBeDefined();
      expect(response.body.data.kycStatus).toBe('kyc_submitted');
      expect(response.body.data.updatedAt).toBeDefined();

      // Verify R2 upload was called
      expect(mockR2.uploadFile).toHaveBeenCalled();
      expect(mockR2.getSignedFileUrl).toHaveBeenCalledWith(
        'nearby-kyc',
        expect.any(String),
        300
      );

      // Verify Redis setex was called to cache the result
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining(`kyc:${shopId}:`),
        300,
        expect.any(String)
      );
    });

    // Test 2: Non-PDF file returns 400 INVALID_FILE_TYPE
    it('should reject non-PDF file (400 INVALID_FILE_TYPE)', async () => {
      const idempotencyKey = uuidv4();
      const txtBuffer = Buffer.from('Not a PDF file');

      // Mock: shopOwnerGuard shop ownership verification
      mockSupabase.from.mockReturnValueOnce(mockShopOwnershipVerification(shopId));

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('Authorization', `Bearer ${shopOwnerTokenWithShop}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', txtBuffer, 'document.txt')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
      expect(response.body.error.message).toContain('PDF');
    });

    // Test 3: File > 10 MB returns 413 FILE_TOO_LARGE
    it('should reject file larger than 10 MB (413 FILE_TOO_LARGE)', async () => {
      // Create a buffer larger than 10 MB (multer will reject it before reaching handler)
      const idempotencyKey = uuidv4();
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      // Mock: shopOwnerGuard shop ownership verification
      mockSupabase.from.mockReturnValueOnce(mockShopOwnershipVerification(shopId));

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('Authorization', `Bearer ${shopOwnerTokenWithShop}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', largeBuffer, 'large.pdf')
        .expect(413);

      expect(response.body).toBeDefined();
    });

    // Test 4: Different shop owner uploading for another's shop returns 403 UNAUTHORIZED
    it('should reject other shop owner uploading for different shop (403 UNAUTHORIZED)', async () => {
      const otherShopId = uuidv4();
      const differentShopOwnerId = uuidv4();
      const differentToken = generateToken({
        userId: differentShopOwnerId,
        phone: '+918765432100',
        role: 'shop_owner',
        shopId: otherShopId,
      });

      const idempotencyKey = uuidv4();
      const pdfBuffer = createPdfBuffer(100);

      // Mock: shopOwnerGuard will check and find mismatch
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(shopId, shopOwnerId) // shopId belongs to shopOwnerId, not differentShopOwnerId
      );

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`) // Trying to upload for shopId
        .set('Authorization', `Bearer ${differentToken}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', pdfBuffer, 'kyc.pdf')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    // Test 5: Shop not found returns 404 SHOP_NOT_FOUND
    it('should return 404 SHOP_NOT_FOUND when shop does not exist', async () => {
      const idempotencyKey = uuidv4();

      // Mock: Redis get (idempotency check) - not cached
      mockRedis.get.mockResolvedValueOnce(null);

      // Mock: shopOwnerGuard shop ownership verification (returns error for the shopId in the token)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows found' },
        }),
      });

      const pdfBuffer = createPdfBuffer(100);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`) // Use the shopId from the token
        .set('Authorization', `Bearer ${shopOwnerTokenWithShop}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', pdfBuffer, 'kyc.pdf')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SHOP_NOT_FOUND');
    });

    // Test 6: Unauthenticated request returns 401 UNAUTHORIZED
    it('should reject unauthenticated KYC upload (401 UNAUTHORIZED)', async () => {
      const idempotencyKey = uuidv4();
      const pdfBuffer = createPdfBuffer(100);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', pdfBuffer, 'kyc.pdf')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    // Test 7: No file in request returns 400
    it('should reject request with no file (400)', async () => {
      const idempotencyKey = uuidv4();

      // Mock: shopOwnerGuard shop ownership verification
      mockSupabase.from.mockReturnValueOnce(mockShopOwnershipVerification(shopId));

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('Authorization', `Bearer ${shopOwnerTokenWithShop}`)
        .set('idempotency-key', idempotencyKey)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    // Test 8: Customer role cannot upload KYC returns 403 FORBIDDEN
    it('should reject customer attempting KYC upload (403 FORBIDDEN)', async () => {
      const idempotencyKey = uuidv4();
      const pdfBuffer = createPdfBuffer(100);

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/kyc`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('idempotency-key', idempotencyKey)
        .attach('document', pdfBuffer, 'kyc.pdf')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });
});
