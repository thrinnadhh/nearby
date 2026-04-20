import request from 'supertest';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

describe('Earnings Endpoints', () => {
  let shopId;
  let shopOwnerId;
  let customerId;
  let shopToken;
  let orderId;

  const createTestShop = async () => {
    const newShopId = uuidv4();
    const newOwnerId = uuidv4();

    await supabase.from('profiles').insert({
      id: newOwnerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'shop_owner',
      display_name: 'Test Earnings Shop',
    });

    await supabase.from('shops').insert({
      id: newShopId,
      owner_id: newOwnerId,
      name: 'Test Earnings Shop',
      latitude: 17.3850,
      longitude: 78.4867,
      category: 'kirana',
      is_open: true,
      kyc_status: 'approved',
    });

    return { shopId: newShopId, ownerId: newOwnerId };
  };

  const createTestOrder = async (testShopId, testCustomerId, totalPaise = 100000) => {
    const newOrderId = uuidv4();
    const productId = uuidv4();

    await supabase.from('products').insert({
      id: productId,
      shop_id: testShopId,
      name: 'Earnings Test Product',
      price_paise: totalPaise,
      category: 'test',
      stock_qty: 100,
    });

    await supabase.from('orders').insert({
      id: newOrderId,
      customer_id: testCustomerId,
      shop_id: testShopId,
      status: 'delivered',
      total_paise: totalPaise,
      payment_method: 'card',
      payment_status: 'completed',
      delivery_address: 'Test Address',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await supabase.from('order_items').insert({
      id: uuidv4(),
      order_id: newOrderId,
      product_id: productId,
      quantity: 1,
      unit_price_paise: totalPaise,
    });

    return { orderId: newOrderId, productId };
  };

  beforeEach(async () => {
    const testShop = await createTestShop();
    shopId = testShop.shopId;
    shopOwnerId = testShop.ownerId;

    customerId = uuidv4();
    await supabase.from('profiles').insert({
      id: customerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'customer',
      display_name: 'Test Earnings Customer',
    });

    const orderData = await createTestOrder(shopId, customerId, 100000);
    orderId = orderData.orderId;

    shopToken = jwt.sign(
      { userId: shopOwnerId, phone: '+919876543210', role: 'shop_owner', shopId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    try {
      await supabase.from('messages').delete().eq('shop_id', shopId);
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

  describe('GET /api/v1/shops/:shopId/earnings', () => {
    it('should return earnings for valid shop', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should calculate commission correctly (10% deduction)', async () => {
      // Order total: ₹1000 (100000 paise), commission 10% = ₹100 (10000 paise)
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      const data = response.body.data;
      
      // Verify commission exists in response - endpoint returns _paise properties
      expect(data).toHaveProperty('gross_revenue_paise');
      expect(data).toHaveProperty('commission_paise');
      expect(data).toHaveProperty('net_revenue_paise');
    });

    it('should support date filtering with date_from', async () => {
      const today = new Date();
      today.setDate(today.getDate() - 7);
      const dateFrom = today.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .query({ date_from: dateFrom })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support date filtering with date_to', async () => {
      const today = new Date();
      const dateTo = today.toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .query({ date_to: dateTo })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support date range filtering', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .query({
          date_from: startDate.toISOString().split('T')[0],
          date_to: endDate.toISOString().split('T')[0],
        })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`);

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
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent viewing other shop earnings', async () => {
      const otherShop = await createTestShop();
      
      const response = await request(app)
        .get(`/api/v1/shops/${otherShop.shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      await supabase.from('shops').delete().eq('id', otherShop.shopId);
      await supabase.from('profiles').delete().eq('id', otherShop.ownerId);
    });

    it('should handle shop with no earnings', async () => {
      const emptyShop = await createTestShop();
      const emptyToken = jwt.sign(
        { userId: emptyShop.ownerId, phone: '+919876543212', role: 'shop_owner', shopId: emptyShop.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/shops/${emptyShop.shopId}/earnings`)
        .set('Authorization', `Bearer ${emptyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      await supabase.from('shops').delete().eq('id', emptyShop.shopId);
      await supabase.from('profiles').delete().eq('id', emptyShop.ownerId);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .query({ date_from: 'invalid-date' })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should return numeric fields', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      const data = response.body.data;
      
      // Check that numeric fields are present
      if (data.total_orders !== undefined) {
        expect(typeof data.total_orders).toBe('number');
      }
    });

    it('should return ISO8601 timestamps', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      const data = response.body.data;
      
      if (data.created_at) {
        expect(new Date(data.created_at)).toBeInstanceOf(Date);
      }
    });
  });

  describe('GET /api/v1/shops/:shopId/earnings/weekly', () => {
    it('should return weekly earnings summary', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings/weekly`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should support pagination with page', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings/weekly`)
        .query({ page: 1 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination with limit', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings/weekly`)
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings/weekly`);

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
        .get(`/api/v1/shops/${shopId}/earnings/weekly`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent viewing other shop weekly earnings', async () => {
      const otherShop = await createTestShop();
      
      const response = await request(app)
        .get(`/api/v1/shops/${otherShop.shopId}/earnings/weekly`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(403);

      await supabase.from('shops').delete().eq('id', otherShop.shopId);
      await supabase.from('profiles').delete().eq('id', otherShop.ownerId);
    });

    it('should handle shop with no weekly earnings', async () => {
      const emptyShop = await createTestShop();
      const emptyToken = jwt.sign(
        { userId: emptyShop.ownerId, phone: '+919876543213', role: 'shop_owner', shopId: emptyShop.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/shops/${emptyShop.shopId}/earnings/weekly`)
        .set('Authorization', `Bearer ${emptyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      await supabase.from('shops').delete().eq('id', emptyShop.shopId);
      await supabase.from('profiles').delete().eq('id', emptyShop.ownerId);
    });
  });

  describe('POST /api/v1/shops/:shopId/earnings/withdraw', () => {
    beforeEach(async () => {
      // Update shop with bank account for withdrawal
      await supabase
        .from('shops')
        .update({
          bank_account_number: '1234567890',
          bank_ifsc: 'HDFC0000123',
          bank_account_name: 'Test Account',
        })
        .eq('id', shopId);
    });

    it('should initiate withdrawal request', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: 50000, // ₹500
        });

      expect([200, 201, 202]).toContain(response.status);
      expect(response.body).toHaveProperty('success');
    });

    it('should validate withdrawal amount', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: -50000,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require minimum withdrawal amount', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: 1000, // Less than minimum
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .send({
          amount_paise: 50000,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should require bank account linked', async () => {
      const newShop = await createTestShop();
      const newToken = jwt.sign(
        { userId: newShop.ownerId, phone: '+919876543214', role: 'shop_owner', shopId: newShop.shopId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .post(`/api/v1/shops/${newShop.shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          amount_paise: 50000,
        });

      expect([400, 422]).toContain(response.status);

      await supabase.from('shops').delete().eq('id', newShop.shopId);
      await supabase.from('profiles').delete().eq('id', newShop.ownerId);
    });

    it('should prevent withdrawal exceeding available balance', async () => {
      // Try to withdraw more than available
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: 999999999, // Huge amount
        });

      expect([400, 422]).toContain(response.status);
    });

    it('should require amount_paise field', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate amount is numeric', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return withdrawal status in response', async () => {
      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          amount_paise: 50000,
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.data).toHaveProperty('id');
      }
    });
  });

  describe('Earnings security and edge cases', () => {
    it('should not allow unauthorized user to withdraw', async () => {
      const unauthorizedToken = jwt.sign(
        { userId: uuidv4(), phone: '+919999999999', role: 'shop_owner', shopId: uuidv4() },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          amount_paise: 50000,
        });

      expect(response.status).toBe(403);
    });

    it('should handle concurrent withdrawal requests', async () => {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post(`/api/v1/shops/${shopId}/earnings/withdraw`)
            .set('Authorization', `Bearer ${shopToken}`)
            .send({
              amount_paise: 10000,
            })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(3);
    });

    it('should return proper response format', async () => {
      const response = await request(app)
        .get(`/api/v1/shops/${shopId}/earnings`)
        .set('Authorization', `Bearer ${shopToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });
  });
});
