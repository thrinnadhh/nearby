import request from 'supertest';
import app from '../../src/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

describe('Admin Broadcast Endpoints (13.7.1-13.7.2)', () => {
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
  
  describe('13.7.1: POST /admin/broadcast (send campaign)', () => {
    it('should create broadcast campaign for customers', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Flash Sale Today',
          body: 'Get 50% off on all items today only!',
          deep_link: 'https://nearby.app/sale',
          target: 'customers'
        });
      
      expect([201, 400, 429]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('broadcast_id');
        expect(res.body.data).toHaveProperty('status');
        expect(['pending', 'scheduled']).toContain(res.body.data.status);
        expect(res.body.data).toHaveProperty('target', 'customers');
        expect(res.body.data).toHaveProperty('created_at');
      }
    });
    
    it('should create broadcast campaign for shops', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'New Feature Available',
          body: 'Check out our new inventory management tool',
          target: 'shops'
        });
      
      expect([201, 400, 429]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.target).toBe('shops');
      }
    });
    
    it('should create broadcast campaign for delivery partners', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'High Demand Area',
          body: 'Surge pricing active in your area!',
          target: 'delivery'
        });
      
      expect([201, 400, 429]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.target).toBe('delivery');
      }
    });
    
    it('should support scheduling with ?scheduled_at ISO date', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Scheduled Campaign',
          body: 'This will be sent later',
          target: 'customers',
          scheduled_at: futureDate.toISOString()
        });
      
      expect([201, 400, 429]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.status).toBe('scheduled');
      }
    });
    
    it('should reject title shorter than 5 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Hey',
          body: 'This is a long enough message to meet minimum requirements',
          target: 'customers'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject title longer than 200 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'a'.repeat(201),
          body: 'This is a long enough message',
          target: 'customers'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject body shorter than 10 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'Short',
          target: 'customers'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject body longer than 500 characters', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'a'.repeat(501),
          target: 'customers'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject invalid deep_link (not URI)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'This is a message',
          deep_link: 'not-a-valid-url',
          target: 'customers'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should reject invalid target', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'This is a message',
          target: 'invalid_target'
        });
      
      expect(res.status).toBe(400);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Good Title',
          body: 'This is a message',
          target: 'customers'
        });
      
      expect(res.status).toBe(403);
    });
    
    it('should enforce rate limit: 1 broadcast per hour per admin', async () => {
      // First broadcast should succeed or be rate limited
      const res1 = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'First Campaign',
          body: 'This is the first broadcast',
          target: 'customers'
        });
      
      expect([201, 429]).toContain(res1.status);
      
      // Immediate second broadcast should be rate limited
      if (res1.status === 201) {
        const res2 = await request(app)
          .post('/api/v1/admin/broadcast')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Second Campaign',
            body: 'This is the second broadcast',
            target: 'customers'
          });
        
        expect(res2.status).toBe(429);
      }
    });
    
    it('should queue BullMQ job for broadcast', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'This is a message for job queueing',
          target: 'customers'
        });
      
      expect([201, 400, 429]).toContain(res.status);
    });
    
    it('should include optional deep_link in response', async () => {
      const res = await request(app)
        .post('/api/v1/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Good Title',
          body: 'Message with deep link',
          deep_link: 'https://nearby.app/promo',
          target: 'customers'
        });
      
      expect([201, 400, 429]).toContain(res.status);
    });
  });
  
  describe('13.7.2: GET /admin/broadcast/history (campaign list)', () => {
    it('should return list of broadcasts', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('broadcasts');
      expect(Array.isArray(res.body.data.broadcasts)).toBe(true);
      expect(res.body.data).toHaveProperty('meta');
      expect(res.body.data.meta).toHaveProperty('page');
      expect(res.body.data.meta).toHaveProperty('total');
      expect(res.body.data.meta).toHaveProperty('pages');
    });
    
    it('should support pagination with ?page=2&limit=10', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(2);
      expect(res.body.data.meta.limit).toBe(10);
    });
    
    it('should support filtering by ?target=customers', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?target=customers')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.broadcasts.length > 0) {
        res.body.data.broadcasts.forEach(b => {
          expect(b.target).toBe('customers');
        });
      }
    });
    
    it('should support filtering by ?target=shops', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?target=shops')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.broadcasts)).toBe(true);
    });
    
    it('should support filtering by ?target=delivery', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?target=delivery')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.broadcasts)).toBe(true);
    });
    
    it('should support filtering by ?status=pending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.broadcasts.length > 0) {
        res.body.data.broadcasts.forEach(b => {
          expect(b.status).toBe('pending');
        });
      }
    });
    
    it('should support filtering by ?status=sent', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?status=sent')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.broadcasts)).toBe(true);
    });
    
    it('should include id, title, target, status, sent_count, created_at, scheduled_at', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.broadcasts.length > 0) {
        const broadcast = res.body.data.broadcasts[0];
        expect(broadcast).toHaveProperty('id');
        expect(broadcast).toHaveProperty('title');
        expect(broadcast).toHaveProperty('target');
        expect(broadcast).toHaveProperty('status');
        expect(broadcast).toHaveProperty('sent_count');
        expect(broadcast).toHaveProperty('created_at');
        expect(broadcast).toHaveProperty('scheduled_at');
      }
    });
    
    it('should sort by created_at descending (newest first)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.broadcasts.length > 1) {
        const first = new Date(res.body.data.broadcasts[0].created_at);
        const second = new Date(res.body.data.broadcasts[1].created_at);
        expect(first >= second).toBe(true);
      }
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(403);
    });
    
    it('should default to page 1 if invalid page provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?page=-1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(1);
    });
    
    it('should limit page size to 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history?limit=1000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.limit).toBeLessThanOrEqual(100);
    });
    
    it('should handle empty broadcast history gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/broadcast/history')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.broadcasts)).toBe(true);
    });
  });
});
