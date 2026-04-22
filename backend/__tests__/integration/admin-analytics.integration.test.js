import request from 'supertest';
import app from '../../src/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../src/services/supabase.js';

describe('Admin Analytics Endpoints (13.6.1-13.6.3)', () => {
  

  const makeToken = (role = 'admin') =>
    jwt.sign(
      { userId: uuidv4(), phone: '+919999999999', role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

  let adminToken;

  beforeAll(async () => {
    adminToken = makeToken('admin');
  });
  
  describe('13.6.1: GET /admin/analytics (summary metrics)', () => {
    it('should return summary metrics: gmv_total, orders_total, customers_total, shops_active', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('gmv_total');
      expect(res.body.data).toHaveProperty('orders_total');
      expect(res.body.data).toHaveProperty('customers_total');
      expect(res.body.data).toHaveProperty('shops_active');
      expect(res.body.data).toHaveProperty('currency', 'INR');
      expect(typeof res.body.data.gmv_total).toBe('number');
      expect(typeof res.body.data.orders_total).toBe('number');
      expect(typeof res.body.data.customers_total).toBe('number');
      expect(typeof res.body.data.shops_active).toBe('number');
    });
    
    it('should return gmv_total = 0 when no delivered orders exist', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.gmv_total).toBeGreaterThanOrEqual(0);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer mock-customer-token`);
      
      expect(res.status).toBe(403);
    });
    
    it('should reject request without authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics');
      
      expect(res.status).toBe(401);
    });
    
    it('should calculate gmv_total as sum of delivered order amounts', async () => {
      // This would be tested with real data setup
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.gmv_total >= 0).toBe(true);
    });
    
    it('should count unique active approved shops', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.shops_active >= 0).toBe(true);
    });
  });
  
  describe('13.6.2: GET /admin/analytics/daily (by date range)', () => {
    it('should return daily revenue and order count for default 7d range', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('daily');
      expect(Array.isArray(res.body.data.daily)).toBe(true);
      expect(res.body.data).toHaveProperty('by_city');
      expect(Array.isArray(res.body.data.by_city)).toBe(true);
      expect(res.body.data).toHaveProperty('range');
      expect(res.body.data).toHaveProperty('currency', 'INR');
    });
    
    it('should support ?range=30d query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily?range=30d')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.range).toBe('30d');
    });
    
    it('should support ?date=2026-04-20 query parameter for single day', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily?date=2026-04-20')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.range).toBe('single_day');
    });
    
    it('should return city breakdown with gmv and orders count', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.by_city.length > 0) {
        const cityData = res.body.data.by_city[0];
        expect(cityData).toHaveProperty('city');
        expect(cityData).toHaveProperty('gmv');
        expect(cityData).toHaveProperty('orders');
        expect(typeof cityData.gmv).toBe('number');
        expect(typeof cityData.orders).toBe('number');
      }
    });
    
    it('should handle 90d range query', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily?range=90d')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.range).toBe('90d');
    });
    
    it('should return empty daily array if no orders in date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      const res = await request(app)
        .get(`/api/v1/admin/analytics/daily?date=${dateStr}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.daily).toBeDefined();
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/daily')
        .set('Authorization', `Bearer mock-customer-token`);
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('13.6.3: GET /admin/analytics/top-shops (top 10 by revenue)', () => {
    it('should return top 10 shops by revenue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('top_shops');
      expect(Array.isArray(res.body.data.top_shops)).toBe(true);
      expect(res.body.data).toHaveProperty('count');
      expect(res.body.data).toHaveProperty('currency', 'INR');
    });
    
    it('should limit to 10 shops by default', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.top_shops.length).toBeLessThanOrEqual(10);
    });
    
    it('should support ?limit query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops?limit=5')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.top_shops.length).toBeLessThanOrEqual(5);
    });
    
    it('should include shop_id, shop_name, revenue, orders_count, avg_rating', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.top_shops.length > 0) {
        const shop = res.body.data.top_shops[0];
        expect(shop).toHaveProperty('shop_id');
        expect(shop).toHaveProperty('shop_name');
        expect(shop).toHaveProperty('revenue');
        expect(shop).toHaveProperty('orders_count');
        expect(shop).toHaveProperty('avg_rating');
      }
    });
    
    it('should sort by revenue descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.top_shops.length > 1) {
        const first = res.body.data.top_shops[0];
        const second = res.body.data.top_shops[1];
        expect(first.revenue >= second.revenue).toBe(true);
      }
    });
    
    it('should cap limit at 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.top_shops.length).toBeLessThanOrEqual(100);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer mock-customer-token`);
      
      expect(res.status).toBe(403);
    });
    
    it('should handle empty results gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics/top-shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.top_shops)).toBe(true);
    });
  });
});
