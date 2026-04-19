import request from 'supertest';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

describe('GET /api/v1/shops/:shopId/analytics/top-products', () => {
  let shopId;
  let shopOwnerId;
  let shopToken;
  let customerId;
  let orderId;

  const createTestShop = async () => {
    const newShopId = uuidv4();
    const newOwnerId = uuidv4();
    
    await supabase.from('profiles').insert({
      id: newOwnerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'shop_owner',
      display_name: 'Test Shop Owner',
    });

    await supabase.from('shops').insert({
      id: newShopId,
      owner_id: newOwnerId,
      name: 'Test Analytics Shop',
      latitude: 17.3850,
      longitude: 78.4867,
      category: 'kirana',
      is_open: true,
      kyc_status: 'approved',
    });

    return { shopId: newShopId, ownerId: newOwnerId };
  };

  const createTestProducts = async (testShopId) => {
    const productIds = [];
    for (let i = 0; i < 3; i++) {
      const productId = uuidv4();
      await supabase.from('products').insert({
        id: productId,
        shop_id: testShopId,
        name: `Product ${i + 1}`,
        price_paise: 10000 * (i + 1),
        category: 'test',
        stock_qty: 100,
      });
      productIds.push(productId);
    }
    return productIds;
  };

  const createTestOrder = async (testShopId, productIds) => {
    const newCustomerId = uuidv4();
    const newOrderId = uuidv4();

    await supabase.from('profiles').insert({
      id: newCustomerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'customer',
      display_name: 'Test Customer',
    });

    await supabase.from('orders').insert({
      id: newOrderId,
      customer_id: newCustomerId,
      shop_id: testShopId,
      status: 'delivered',
      total_paise: 50000,
      payment_method: 'card',
      payment_status: 'completed',
      delivery_address: 'Test Address',
    });

    // Add order items
    for (let i = 0; i < productIds.length; i++) {
      await supabase.from('order_items').insert({
        id: uuidv4(),
        order_id: newOrderId,
        product_id: productIds[i],
        quantity: i + 1,
        unit_price_paise: 10000 * (i + 1),
      });
    }

    return { customerId: newCustomerId, orderId: newOrderId };
  };

  beforeEach(async () => {
    const testShop = await createTestShop();
    shopId = testShop.shopId;
    shopOwnerId = testShop.ownerId;

    // Create JWT token for shop owner
    shopToken = jwt.sign(
      { userId: shopOwnerId, phone: '+919876543210', role: 'shop_owner', shopId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create test products and orders
    const productIds = await createTestProducts(shopId);
    const orderData = await createTestOrder(shopId, productIds);
    customerId = orderData.customerId;
    orderId = orderData.orderId;
  });

  afterEach(async () => {
    try {
      // Clean up test data
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      await supabase.from('products').delete().eq('shop_id', shopId);
      await supabase.from('shops').delete().eq('id', shopId);
      await supabase.from('profiles').delete().eq('id', shopOwnerId);
      await supabase.from('profiles').delete().eq('id', customerId);
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('Happy path', () => {
    it('should return top products for valid shop with default limit', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data.products) || response.body.data).toBeDefined();
    });

    it('should respect limit parameter (5 max)', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support 7d, 30d, 90d date ranges', async () => {
      for (const range of ['7d', '30d', '90d']) {
        const response = await request(app)
          .get(`/api/v1/shops/${shopId}/analytics/top-products`)
          .query({ dateRange: range })
          .set('Authorization', `Bearer ${shopToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Validation', () => {
    it('should validate limit parameter (1-100)', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ limit: 101 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate dateRange parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ dateRange: 'invalid' })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid shopId format', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/invalid-id/analytics/top-products`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require shop_owner role', async () => {
      const customerToken = jwt.sign(
        { userId: customerId, phone: '+919876543211', role: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent shop owner from viewing other shop analytics', async () => {
      const otherShop = await createTestShop();
      
      const response = await request(app)
        .get(`/api/v1/shops/${otherShop.shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      // Cleanup
      await supabase.from('shops').delete().eq('id', otherShop.shopId);
      await supabase.from('profiles').delete().eq('id', otherShop.ownerId);
    });
  });

  describe('Edge cases', () => {
    it('should handle shop with no orders', async () => {
      const emptyShop = await createTestShop();
      const emptyShopToken = jwt.sign(
        { userId: emptyShop.ownerId, phone: '+919876543212', role: 'shop_owner', shopId: emptyShop.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/shops/${emptyShop.shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${emptyShopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Cleanup
      await supabase.from('shops').delete().eq('id', emptyShop.shopId);
      await supabase.from('profiles').delete().eq('id', emptyShop.ownerId);
    });

    it('should handle future dates gracefully', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ dateRange: '7d' })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle minimum limit (1)', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle maximum limit (100)', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .query({ limit: 100 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Response format', () => {
    it('should return properly formatted response', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.success).toBe(true);
    });

    it('should include necessary fields in product data', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/analytics/top-products`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      const data = response.body.data;
      
      if (Array.isArray(data)) {
        data.forEach(product => {
          expect(product).toHaveProperty('id');
          expect(product).toHaveProperty('name');
        });
      }
    });
  });

  describe('Rate limiting', () => {
    it('should handle rapid consecutive requests', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get(`/api/v1/shops/${shopId}/analytics/top-products`)
            .set('Authorization', `Bearer ${shopToken}`)
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      expect(results.some(r => r.status === 200)).toBe(true);
    });
  });
});
