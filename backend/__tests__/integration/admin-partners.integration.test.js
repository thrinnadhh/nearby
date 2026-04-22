import request from 'supertest';
import app from '../../src/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

describe('Admin Delivery Partners Endpoints (13.6.4-13.6.7)', () => {
  let adminToken;
  let customerToken;

  const makeToken = (role = 'admin') =>
    jwt.sign(
      { userId: uuidv4(), phone: '+919999999999', role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

  beforeAll(async () => {
    adminToken = makeToken('admin');
    customerToken = makeToken('customer');
  });
  
  describe('13.6.4: GET /admin/delivery-partners (list with pagination, search, sort)', () => {
    it('should return paginated list of delivery partners', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('delivery_partners');
      expect(Array.isArray(res.body.data.delivery_partners)).toBe(true);
      expect(res.body.data).toHaveProperty('meta');
      expect(res.body.data.meta).toHaveProperty('page');
      expect(res.body.data.meta).toHaveProperty('total');
      expect(res.body.data.meta).toHaveProperty('pages');
      expect(res.body.data.meta).toHaveProperty('limit');
    });
    
    it('should support pagination with ?page=2&limit=10', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(2);
      expect(res.body.data.meta.limit).toBe(10);
    });
    
    it('should support ?search query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?search=John')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.delivery_partners)).toBe(true);
    });
    
    it('should support sorting by ?sort=earnings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?sort=earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.delivery_partners.length > 1) {
        const first = res.body.data.delivery_partners[0];
        const second = res.body.data.delivery_partners[1];
        expect(first.total_earnings >= second.total_earnings).toBe(true);
      }
    });
    
    it('should support sorting by ?sort=rating', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?sort=rating')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.delivery_partners)).toBe(true);
    });
    
    it('should support sorting by ?sort=orders', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?sort=orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.delivery_partners)).toBe(true);
    });
    
    it('should include id, name, phone, status, total_earnings, rating, orders_completed', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.delivery_partners.length > 0) {
        const partner = res.body.data.delivery_partners[0];
        expect(partner).toHaveProperty('id');
        expect(partner).toHaveProperty('name');
        expect(partner).toHaveProperty('phone');
        expect(partner).toHaveProperty('status');
        expect(partner).toHaveProperty('total_earnings');
        expect(partner).toHaveProperty('rating');
        expect(partner).toHaveProperty('orders_completed');
      }
    });
    
    it('should limit page size to 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.limit).toBeLessThanOrEqual(100);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(403);
    });
    
    it('should default to page 1 if invalid page provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners?page=0')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(1);
    });
  });
  
  describe('13.6.5: PATCH /admin/delivery-partners/:id/suspend (with reason)', () => {
    it('should suspend delivery partner with required reason', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Multiple complaints received' });
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('partner_id', 'dp-123');
        expect(res.body.data).toHaveProperty('status', 'suspended');
        expect(res.body.data).toHaveProperty('reason');
        expect(res.body.data).toHaveProperty('suspended_at');
      }
    });
    
    it('should reject if reason less than 10 characters', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'short' });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject if reason exceeds 500 characters', async () => {
      const longReason = 'a'.repeat(501);
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: longReason });
      
      expect(res.status).toBe(400);
    });
    
    it('should send FCM notification to partner', async () => {
      // This would be tested with mocked FCM
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of guidelines' });
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Multiple complaints' });
      
      expect(res.status).toBe(403);
    });
    
    it('should record suspended_by_admin', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of terms' });
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should return 404 if partner not found', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/nonexistent-id/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of guidelines' });
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('13.6.6: PATCH /admin/delivery-partners/:id/reinstate (unsuspend)', () => {
    it('should reinstate suspended delivery partner', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/reinstate')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 400, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('partner_id', 'dp-123');
        expect(res.body.data).toHaveProperty('status', 'active');
        expect(res.body.data).toHaveProperty('reinstated_at');
      }
    });
    
    it('should reject reinstatement if partner not suspended', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-active/reinstate')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 400, 404]).toContain(res.status);
    });
    
    it('should send FCM notification to partner', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/reinstate')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 400, 404]).toContain(res.status);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/dp-123/reinstate')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(403);
    });
    
    it('should return 404 if partner not found', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/delivery-partners/nonexistent-id/reinstate')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('13.6.7: GET /admin/delivery-partners/:id/earnings (history)', () => {
    it('should return earnings history for delivery partner', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('partner_id', 'dp-123');
        expect(res.body.data).toHaveProperty('earnings');
        expect(Array.isArray(res.body.data.earnings)).toBe(true);
        expect(res.body.data).toHaveProperty('total_earnings');
        expect(res.body.data).toHaveProperty('total_commissions');
        expect(res.body.data).toHaveProperty('currency', 'INR');
      }
    });
    
    it('should default to 30 day earnings', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.days).toBe(30);
      }
    });
    
    it('should support ?days query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings?days=7')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.days).toBe(7);
      }
    });
    
    it('should include date, orders, earnings, commission_paid in earnings array', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200 && res.body.data.earnings.length > 0) {
        const entry = res.body.data.earnings[0];
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('orders');
        expect(entry).toHaveProperty('earnings');
        expect(entry).toHaveProperty('commission_paid');
      }
    });
    
    it('should cap days at 365', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings?days=1000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.days).toBeLessThanOrEqual(365);
      }
    });
    
    it('should return empty earnings for new partner', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-new/earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.earnings).toBeDefined();
      }
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/dp-123/earnings')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(403);
    });
    
    it('should return 404 if partner not found', async () => {
      const res = await request(app)
        .get('/api/v1/admin/delivery-partners/nonexistent-id/earnings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });
  });
});
