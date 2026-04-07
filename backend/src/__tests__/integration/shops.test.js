import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../../index.js';
import { generateToken } from '../../middleware/auth.js';

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

describe('Shops Routes', () => {
  let shopOwnerToken;
  let customerToken;
  let shopOwnerId;
  let customerId;
  let mockSupabase;

  beforeAll(async () => {
    // Get the mocked supabase instance
    const { supabase } = await import('../../services/supabase.js');
    mockSupabase = supabase;

    // Create test shop owner user ID
    shopOwnerId = '550e8400-e29b-41d4-a716-446655440001';
    shopOwnerToken = generateToken({
      userId: shopOwnerId,
      phone: '+919999999999',
      role: 'shop_owner',
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
  const mockProfileSelect = (shopId = null) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopOwnerId,
          phone: '+919999999999',
          role: 'shop_owner',
          shop_id: shopId,
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
  const mockShopInsert = (shopId) => {
    const chain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopId,
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
  const mockProfileUpdate = (shopId) => {
    const chain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: shopOwnerId,
          phone: '+919999999999',
          role: 'shop_owner',
          shop_id: shopId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    };
    return chain;
  };

  describe('POST /api/v1/shops', () => {
    // Test 1: Valid shop creation (201, correct fields)
    it('should successfully create a shop with valid data (201)', async () => {
      const shopId = uuidv4();
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
      mockSupabase.from.mockReturnValueOnce(mockShopInsert(shopId));

      // Mock: profile update
      mockSupabase.from.mockReturnValueOnce(mockProfileUpdate(shopId));

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
});
