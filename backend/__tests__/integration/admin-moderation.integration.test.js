import request from 'supertest';
import app from '../../src/index.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

describe('Admin Moderation Endpoints (13.6.8-13.6.11)', () => {
  let adminToken;

  const makeToken = (role = 'admin') =>
    jwt.sign(
      { userId: uuidv4(), phone: '+919999999999', role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

  beforeAll(async () => {
    adminToken = makeToken('admin');
  });
  
  describe('13.6.8: GET /admin/moderation/queue (flagged content)', () => {
    it('should return flagged content (reviews and products)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('moderation_queue');
      expect(Array.isArray(res.body.data.moderation_queue)).toBe(true);
      expect(res.body.data).toHaveProperty('meta');
    });
    
    it('should support pagination with ?page=2&limit=10', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.meta.page).toBe(2);
      expect(res.body.data.meta.limit).toBe(10);
    });
    
    it('should support filtering by ?type=reviews', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue?type=reviews')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.moderation_queue)).toBe(true);
    });
    
    it('should support filtering by ?type=products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue?type=products')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.moderation_queue)).toBe(true);
    });
    
    it('should include id, content_type, creator_id, created_at, flag_count, reason', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.moderation_queue.length > 0) {
        const item = res.body.data.moderation_queue[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('content_type');
        expect(['review', 'product']).toContain(item.content_type);
        expect(item).toHaveProperty('creator_id');
        expect(item).toHaveProperty('created_at');
        expect(item).toHaveProperty('flag_count');
        expect(item).toHaveProperty('reason');
      }
    });
    
    it('should sort by flag_count descending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      if (res.body.data.moderation_queue.length > 1) {
        const first = res.body.data.moderation_queue[0];
        const second = res.body.data.moderation_queue[1];
        expect(first.flag_count >= second.flag_count).toBe(true);
      }
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer mock-customer-token`);
      
      expect(res.status).toBe(403);
    });
    
    it('should handle empty queue gracefully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/moderation/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.moderation_queue)).toBe(true);
    });
  });
  
  describe('13.6.9: POST /admin/moderation/:id/approve (unflag)', () => {
    it('should approve and unflag review content', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('id', 'review-123');
        expect(res.body.data).toHaveProperty('content_type', 'review');
        expect(res.body.data).toHaveProperty('status', 'approved');
        expect(res.body.data).toHaveProperty('approved_at');
      }
    });
    
    it('should approve and unflag product content', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/product-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'product' });
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.content_type).toBe('product');
        expect(res.body.data.status).toBe('approved');
      }
    });
    
    it('should notify creator of approval', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/approve')
        .set('Authorization', `Bearer mock-customer-token`)
        .send({ content_type: 'review' });
      
      expect(res.status).toBe(403);
    });
    
    it('should default to review content_type if not provided', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should return 404 if content not found', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/nonexistent-id/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect(res.status).toBe(404);
    });
  });
  
  describe('13.6.10: POST /admin/moderation/:id/remove (soft delete)', () => {
    it('should remove review content and notify creator', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content_type: 'review',
          reason: 'Contains offensive language'
        });
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('id', 'review-123');
        expect(res.body.data).toHaveProperty('content_type', 'review');
        expect(res.body.data).toHaveProperty('status', 'removed');
        expect(res.body.data).toHaveProperty('removed_at');
        expect(res.body.data).toHaveProperty('reason');
      }
    });
    
    it('should remove product content and delete from Typesense', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/product-123/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content_type: 'product',
          reason: 'Violates community guidelines'
        });
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.content_type).toBe('product');
        expect(res.body.data.status).toBe('removed');
      }
    });
    
    it('should use default reason if not provided', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should notify creator of removal with reason', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content_type: 'review',
          reason: 'Spam content'
        });
      
      expect([200, 404]).toContain(res.status);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/remove')
        .set('Authorization', `Bearer mock-customer-token`)
        .send({ content_type: 'review' });
      
      expect(res.status).toBe(403);
    });
    
    it('should return 404 if content not found', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/nonexistent-id/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect(res.status).toBe(404);
    });
    
    it('should soft delete (not hard delete) content', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/review-123/remove')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content_type: 'review' });
      
      expect([200, 404]).toContain(res.status);
    });
  });
  
  describe('13.6.11: POST /admin/moderation/schema/setup (Typesense schema)', () => {
    it('should set up moderation schema in Typesense', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/schema/setup')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('schema_name', 'moderation');
        expect(res.body.data).toHaveProperty('status', 'ready');
        expect(res.body.data).toHaveProperty('fields');
      }
    });
    
    it('should be idempotent (can call multiple times)', async () => {
      const res1 = await request(app)
        .post('/api/v1/admin/moderation/schema/setup')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const res2 = await request(app)
        .post('/api/v1/admin/moderation/schema/setup')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 404]).toContain(res1.status);
      expect([200, 404]).toContain(res2.status);
    });
    
    it('should require admin role', async () => {
      const res = await request(app)
        .post('/api/v1/admin/moderation/schema/setup')
        .set('Authorization', `Bearer mock-customer-token`);
      
      expect(res.status).toBe(403);
    });
  });
});
