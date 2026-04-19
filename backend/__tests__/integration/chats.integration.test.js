import request from 'supertest';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

describe('Chat Endpoints', () => {
  let shopId;
  let shopOwnerId;
  let customerId;
  let orderId;
  let customerToken;
  let shopToken;

  const createTestShop = async () => {
    const newShopId = uuidv4();
    const newOwnerId = uuidv4();

    await supabase.from('profiles').insert({
      id: newOwnerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'shop_owner',
      display_name: 'Test Chat Shop',
    });

    await supabase.from('shops').insert({
      id: newShopId,
      owner_id: newOwnerId,
      name: 'Test Chat Shop',
      latitude: 17.3850,
      longitude: 78.4867,
      category: 'kirana',
      is_open: true,
      kyc_status: 'approved',
    });

    return { shopId: newShopId, ownerId: newOwnerId };
  };

  const createTestOrder = async (testShopId, testCustomerId) => {
    const newOrderId = uuidv4();
    const productId = uuidv4();

    // Create product
    await supabase.from('products').insert({
      id: productId,
      shop_id: testShopId,
      name: 'Test Chat Product',
      price_paise: 10000,
      category: 'test',
      stock_qty: 100,
    });

    // Create order
    await supabase.from('orders').insert({
      id: newOrderId,
      customer_id: testCustomerId,
      shop_id: testShopId,
      status: 'delivered',
      total_paise: 10000,
      payment_method: 'card',
      payment_status: 'completed',
      delivery_address: 'Test Address',
    });

    // Add order items
    await supabase.from('order_items').insert({
      id: uuidv4(),
      order_id: newOrderId,
      product_id: productId,
      quantity: 1,
      unit_price_paise: 10000,
    });

    return { orderId: newOrderId, productId };
  };

  beforeEach(async () => {
    // Create shop
    const testShop = await createTestShop();
    shopId = testShop.shopId;
    shopOwnerId = testShop.ownerId;

    // Create customer
    customerId = uuidv4();
    await supabase.from('profiles').insert({
      id: customerId,
      phone: `+91${Math.random().toString().slice(2, 12)}`,
      role: 'customer',
      display_name: 'Test Chat Customer',
    });

    // Create order
    const orderData = await createTestOrder(shopId, customerId);
    orderId = orderData.orderId;

    // Create tokens
    customerToken = jwt.sign(
      { userId: customerId, phone: '+919876543210', role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    shopToken = jwt.sign(
      { userId: shopOwnerId, phone: '+919876543211', role: 'shop_owner', shopId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    try {
      // Clean up
      await supabase.from('messages').delete().eq('order_id', orderId);
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

  describe('POST /api/v1/chats', () => {
    it('should send message from customer to shop', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: 'Is this item available?',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toBe('Is this item available?');
    });

    it('should send message from shop owner', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          orderId,
          message: 'Yes, item is available',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Yes, item is available');
    });

    it('should validate message length (max 500 chars)', async () => {
      const longMessage = 'a'.repeat(501);
      
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: longMessage,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toMatch(/VALIDATION|INVALID/i);
    });

    it('should reject empty messages', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .send({
          orderId,
          message: 'Test message',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid orderId', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'invalid-id',
          message: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject message to non-existent order', async () => {
      const fakeOrderId = uuidv4();
      
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: fakeOrderId,
          message: 'Test message',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should include timestamp in response', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: 'Test message with timestamp',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('created_at');
      expect(new Date(response.body.data.created_at)).toBeInstanceOf(Date);
    });

    it('should require message field', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require orderId field', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          message: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should accept max length messages (500 chars)', async () => {
      const maxMessage = 'a'.repeat(500);
      
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: maxMessage,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should trim whitespace from messages', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: '  Test message  ',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should support special characters in messages', async () => {
      const specialMessage = 'Hi! Is this 100% available? Price: ₹500 #urgent';
      
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId,
          message: specialMessage,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe(specialMessage);
    });
  });

  describe('GET /api/v1/chats/:orderId', () => {
    beforeEach(async () => {
      // Insert test messages
      await supabase.from('messages').insert([
        {
          id: uuidv4(),
          order_id: orderId,
          shop_id: shopId,
          customer_id: customerId,
          sender_type: 'customer',
          body: 'First message',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: uuidv4(),
          order_id: orderId,
          shop_id: shopId,
          customer_id: customerId,
          sender_type: 'shop',
          body: 'Shop reply',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ]);
    });

    it('should get message thread for order', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return sorted messages (ascending by timestamp)', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      const messages = response.body.data;
      
      for (let i = 1; i < messages.length; i++) {
        const prevTime = new Date(messages[i - 1].created_at).getTime();
        const currTime = new Date(messages[i].created_at).getTime();
        expect(prevTime).toBeLessThanOrEqual(currTime);
      }
    });

    it('should support pagination with limit', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should support pagination with offset', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .query({ offset: 0 })
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should prevent customer from viewing other customer chats', async () => {
      const otherCustomerId = uuidv4();
      await supabase.from('profiles').insert({
        id: otherCustomerId,
        phone: `+91${Math.random().toString().slice(2, 12)}`,
        role: 'customer',
        display_name: 'Other Customer',
      });

      const otherToken = jwt.sign(
        { userId: otherCustomerId, phone: '+919876543212', role: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);

      await supabase.from('profiles').delete().eq('id', otherCustomerId);
    });

    it('should return empty array for order with no messages', async () => {
      const newOrder = await createTestOrder(shopId, customerId);
      
      const response = await request(app)
        .get(`/api/v1/chats/${newOrder.orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Cleanup
      await supabase.from('orders').delete().eq('id', newOrder.orderId);
      await supabase.from('products').delete().eq('id', newOrder.productId);
    });

    it('should include sender_type in messages', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(msg => {
        expect(['customer', 'shop']).toContain(msg.sender_type);
      });
    });

    it('should include is_read status', async () => {
      const response = await request(app)
        .get(`/api/v1/chats/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach(msg => {
        expect(typeof msg.is_read).toBe('boolean');
      });
    });
  });

  describe('Chat security', () => {
    it('should not expose other orders chat to unauthorized users', async () => {
      const otherShop = await createTestShop();
      const otherCustomer = uuidv4();
      
      await supabase.from('profiles').insert({
        id: otherCustomer,
        phone: `+91${Math.random().toString().slice(2, 12)}`,
        role: 'customer',
        display_name: 'Other Customer',
      });

      const otherOrder = await createTestOrder(otherShop.shopId, otherCustomer);
      
      const response = await request(app)
        .get(`/api/v1/chats/${otherOrder.orderId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await supabase.from('messages').delete().eq('order_id', otherOrder.orderId);
      await supabase.from('order_items').delete().eq('order_id', otherOrder.orderId);
      await supabase.from('orders').delete().eq('id', otherOrder.orderId);
      await supabase.from('products').delete().eq('shop_id', otherShop.shopId);
      await supabase.from('shops').delete().eq('id', otherShop.shopId);
      await supabase.from('profiles').delete().eq('id', otherShop.ownerId);
      await supabase.from('profiles').delete().eq('id', otherCustomer);
    });

    it('should mark shop messages as read', async () => {
      const response = await request(app)
        .post('/api/v1/chats')
        .set('Authorization', `Bearer ${shopToken}`)
        .send({
          orderId,
          message: 'Marking shop message',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});
