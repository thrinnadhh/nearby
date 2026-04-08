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

// Mock Typesense sync queue
jest.mock('../../jobs/typesenseSync.js', () => ({
  typesenseSyncQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  },
  typesenseSyncWorker: {},
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
  let mockTypesenseQueue;

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

    // Get the mocked Typesense queue
    const typesenseService = await import('../../jobs/typesenseSync.js');
    mockTypesenseQueue = typesenseService.typesenseSyncQueue;

    // Create test shop owner user ID
    shopOwnerId = '550e8400-e29b-41d4-a716-446655440001';

    // Create shop ID first (needed for shopOwnerToken)
    shopId = uuidv4();

    // Create token with shopId for shop owner (required by shopOwnerGuard middleware)
    shopOwnerToken = generateToken({
      userId: shopOwnerId,
      phone: '+919999999999',
      role: 'shop_owner',
      shopId: shopId,
    });

    // Create token with shopId for KYC tests (same as shopOwnerToken now)
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
   * Helper: Create a shop owner token for a specific shop ID
   * Used for tests that need to operate on different shop IDs
   */
  const createTokenForShop = (testShopId) => {
    return generateToken({
      userId: shopOwnerId,
      phone: '+919999999999',
      role: 'shop_owner',
      shopId: testShopId,
    });
  };

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
   * Mock helper: Setup supabase.from() for shop select (retrieval/update)
   * Returns: complete shop record
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
   * Mock helper: Setup supabase.from() for shop update
   * Returns: updated shop record
   */
  const mockShopUpdate = (shopIdForUpdate, updateData = {}) => {
    const chain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopIdForUpdate,
          owner_id: shopOwnerId,
          name: updateData.name || 'Fresh Kirana Store',
          category: updateData.category || 'kirana',
          phone: updateData.phone || '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: updateData.description || 'A quality kirana store offering fresh vegetables and groceries',
          is_open: updateData.is_open !== undefined ? updateData.is_open : true,
          is_verified: false,
          trust_score: 50.0,
          kyc_document_url: updateData.kyc_document_url || null,
          kyc_status: updateData.kyc_status || 'pending_kyc',
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
  });

  describe('GET /api/v1/shops/:shopId', () => {
    // Test 2: Valid retrieval (200, all fields present)
    it('should successfully retrieve shop profile (200)', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: getShop lookup
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId));

      const response = await request(app)
        .get(`/api/v1/shops/${testShopId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testShopId);
      expect(response.body.data.name).toBe('Fresh Kirana Store');
      expect(response.body.data.category).toBe('kirana');
      expect(response.body.data.isOpen).toBe(true);
      expect(response.body.data.isVerified).toBe(false);
      expect(response.body.data.trustScore).toBe(50.0);
      expect(response.body.data.ownerId).toBe(shopOwnerId);
    });
  });

  describe('PATCH /api/v1/shops/:shopId', () => {
    // Test 3: Valid update (200, selected fields updated)
    it('should successfully update shop profile with valid data (200)', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);
      const updateData = {
        name: 'Updated Kirana Store',
        description: 'Updated description with fresh items and quality products',
      };

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: updateShop lookup
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId));

      // Mock: updateShop update
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, updateData)
      );

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testShopId);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });
  });

  describe('PATCH /api/v1/shops/:shopId/toggle', () => {
    // Test 4: Valid toggle from closed to open (200, isOpen=true)
    it('should toggle shop from closed to open (200)', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: toggleShop lookup (returns shop with is_open=false)
      const closedShop = {
        ...mockShopSelect(testShopId).single,
        data: {
          id: testShopId,
          owner_id: shopOwnerId,
          name: 'Fresh Kirana Store',
          category: 'kirana',
          phone: '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: 'A quality kirana store',
          is_open: false,
          is_verified: false,
          trust_score: 50.0,
          kyc_document_url: null,
          kyc_status: 'pending_kyc',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: closedShop.data,
          error: null,
        }),
      });

      // Mock: toggleShop update (returns toggled shop with is_open=true)
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: true })
      );

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testShopId);
      expect(response.body.data.isOpen).toBe(true);
      expect(mockTypesenseQueue.add).toHaveBeenCalled();
    });

    // Test 5: Valid toggle from open to closed (200, isOpen=false)
    it('should toggle shop from open to closed (200)', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: toggleShop lookup (returns shop with is_open=true)
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId));

      // Mock: toggleShop update (returns toggled shop with is_open=false)
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: false })
      );

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testShopId);
      expect(response.body.data.isOpen).toBe(false);
      expect(mockTypesenseQueue.add).toHaveBeenCalled();
    });

    // Test 6: Shop not found (404, SHOP_NOT_FOUND)
    it('should return 404 when shop does not exist', async () => {
      const invalidShopId = uuidv4();
      const token = createTokenForShop(invalidShopId);

      // Mock: shopOwnerGuard ownership verification (returns null)
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      });

      const response = await request(app)
        .patch(`/api/v1/shops/${invalidShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SHOP_NOT_FOUND');
    });

    // Test 7: Unauthorized (wrong owner) (403, FORBIDDEN)
    it('should return 403 when user does not own the shop', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);
      const otherOwnerId = '550e8400-e29b-41d4-a716-446655440099';

      // Mock: shopOwnerGuard ownership verification (returns shop with different owner)
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId, otherOwnerId)
      );

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    // Test 8: No authentication header (401, UNAUTHORIZED)
    it('should return 401 when missing authentication header', async () => {
      const testShopId = uuidv4();

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    // Test 9: Invalid shop ID format (404, SHOP_NOT_FOUND)
    it('should return 404 when shop ID format is invalid', async () => {
      const invalidUuid = 'invalid-uuid';
      const token = createTokenForShop(invalidUuid);

      const response = await request(app)
        .patch(`/api/v1/shops/${invalidUuid}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SHOP_NOT_FOUND');
    });

    // Test 10: Non-shop_owner role (403, FORBIDDEN)
    it('should return 403 when customer tries to toggle shop', async () => {
      const testShopId = uuidv4();

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    // Test 11: Typesense queue job is queued (200, async job fire-and-forget)
    it('should queue Typesense sync job on toggle', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: toggleShop lookup
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId));

      // Mock: toggleShop update
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: false })
      );

      // Clear the mock to verify it's called
      mockTypesenseQueue.add.mockClear();

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      // Endpoint returns 200 immediately (queue is async)
      expect(response.body.success).toBe(true);
      expect(response.body.data.isOpen).toBe(false);

      // Verify queue job was added
      expect(mockTypesenseQueue.add).toHaveBeenCalledWith(
        'sync',
        expect.objectContaining({
          shopId: testShopId,
          action: 'remove',
        }),
        expect.any(Object)
      );
    });

    // Test 12: Empty body is accepted (200)
    it('should accept empty request body and toggle shop', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // Mock: shopOwnerGuard ownership verification
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Mock: toggleShop lookup
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId));

      // Mock: toggleShop update
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: false })
      );

      const response = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send()
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isOpen).toBe(false);
    });

    // Test 13: Concurrent toggles (last write wins)
    it('should handle concurrent toggles with last write wins', async () => {
      const testShopId = uuidv4();
      const token = createTokenForShop(testShopId);

      // First request: shopOwnerGuard + toggleShop lookup
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );
      mockSupabase.from.mockReturnValueOnce(mockShopSelect(testShopId)); // is_open=true

      // First toggle update (true -> false)
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: false })
      );

      const response1 = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response1.body.data.isOpen).toBe(false);

      // Second request: shopOwnerGuard + toggleShop lookup
      mockSupabase.from.mockReturnValueOnce(
        mockShopOwnershipVerification(testShopId)
      );

      // Second lookup sees is_open=false (from first toggle)
      const secondShop = {
        ...mockShopSelect(testShopId),
        data: {
          id: testShopId,
          owner_id: shopOwnerId,
          name: 'Fresh Kirana Store',
          category: 'kirana',
          phone: '+919876543210',
          latitude: 17.3850,
          longitude: 78.4867,
          description: 'A quality kirana store',
          is_open: false,
          is_verified: false,
          trust_score: 50.0,
          kyc_document_url: null,
          kyc_status: 'pending_kyc',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: secondShop.data,
          error: null,
        }),
      });

      // Second toggle update (false -> true)
      mockSupabase.from.mockReturnValueOnce(
        mockShopUpdate(testShopId, { is_open: true })
      );

      const response2 = await request(app)
        .patch(`/api/v1/shops/${testShopId}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(response2.body.data.isOpen).toBe(true);
    });
  });
});
