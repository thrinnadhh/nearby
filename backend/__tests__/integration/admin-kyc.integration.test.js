/**
 * Sprint 13.5.1–13.5.3: Admin KYC Management Endpoints
 * Tests: GET /admin/kyc/queue, PATCH /admin/kyc/:id/approve, PATCH /admin/kyc/:id/reject
 * Target: 50+ tests
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';

// ─── Token helpers ────────────────────────────────────────────────────────────
const makeToken = (role = 'admin', userId = uuidv4()) =>
  jwt.sign(
    { userId, phone: '+919999999999', role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );

const adminToken = () => makeToken('admin');
const customerToken = () => makeToken('customer');
const shopOwnerToken = () => makeToken('shop_owner');
const invalidToken = () => 'not.a.valid.token';

// ─── DB helpers ───────────────────────────────────────────────────────────────
const createProfile = async (role = 'shop_owner') => {
  const id = uuidv4();
  const phone = '+91' + Math.floor(Math.random() * 9000000000 + 1000000000).toString();
  await supabase.from('profiles').insert({ id, phone, role });
  return { id, phone };
};

const createShop = async (ownerId, phone) => {
  const id = uuidv4();
  await supabase.from('shops').insert({
    id,
    owner_id: ownerId,
    name: 'KYC Test Shop',
    category: 'Kirana',
    phone,
    kyc_status: 'pending',
  });
  return { id };
};

const createKYC = async (shopId, ownerId, status = 'pending') => {
  const id = uuidv4();
  await supabase.from('kyc_submissions').insert({
    id,
    shop_id: shopId,
    owner_id: ownerId,
    status,
    submitted_at: new Date().toISOString(),
    aadhaar_doc_url: 'https://r2.example.com/kyc/aadhaar.pdf',
    gst_doc_url: 'https://r2.example.com/kyc/gst.pdf',
    shop_photo_url: 'https://r2.example.com/kyc/shop.jpg',
  });
  return { id };
};

const cleanup = async ({ kycId, shopId, profileId }) => {
  try {
    if (kycId) await supabase.from('kyc_submissions').delete().eq('id', kycId);
    if (shopId) await supabase.from('shops').delete().eq('id', shopId);
    if (profileId) await supabase.from('profiles').delete().eq('id', profileId);
  } catch (_) { /* ignore cleanup errors */ }
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin KYC Management (13.5.1–13.5.3)', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // GET /admin/kyc/queue — Task 13.5.1
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /admin/kyc/queue (Task 13.5.1)', () => {
    let profileId, shopId, kycId;

    beforeEach(async () => {
      const profile = await createProfile();
      profileId = profile.id;
      const shop = await createShop(profileId, profile.phone);
      shopId = shop.id;
      const kyc = await createKYC(shopId, profileId, 'pending');
      kycId = kyc.id;
    });

    afterEach(async () => cleanup({ kycId, shopId, profileId }));

    it('1. returns 200 with kyc_queue array', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.kyc_queue)).toBe(true);
    });

    it('2. returns meta object with page, total, pages, limit', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { meta } = res.body.data;
      expect(meta).toHaveProperty('page');
      expect(meta).toHaveProperty('total');
      expect(meta).toHaveProperty('pages');
      expect(meta).toHaveProperty('limit');
    });

    it('3. defaults to page=1 and limit=20', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(20);
    });

    it('4. filters by status=pending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?status=pending')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      const allPending = res.body.data.kyc_queue.every(k => k.status === 'pending');
      expect(allPending).toBe(true);
    });

    it('5. filters by status=approved', async () => {
      // Insert an approved KYC
      const approvedKyc = await createKYC(shopId, profileId, 'approved');
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?status=approved')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      const allApproved = res.body.data.kyc_queue.every(k => k.status === 'approved');
      expect(allApproved).toBe(true);
      // cleanup extra KYC
      await supabase.from('kyc_submissions').delete().eq('id', approvedKyc.id);
    });

    it('6. filters by status=rejected', async () => {
      const rejectedKyc = await createKYC(shopId, profileId, 'rejected');
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?status=rejected')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      const allRejected = res.body.data.kyc_queue.every(k => k.status === 'rejected');
      expect(allRejected).toBe(true);
      await supabase.from('kyc_submissions').delete().eq('id', rejectedKyc.id);
    });

    it('7. sort=submitted_at works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?sort=submitted_at')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('8. sort=updated_at works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?sort=updated_at')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('9. custom limit=5 is respected', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?limit=5')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(5);
      expect(res.body.data.kyc_queue.length).toBeLessThanOrEqual(5);
    });

    it('10. limit=200 is capped at 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?limit=200')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(100);
    });

    it('11. page=2 returns second page', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?page=2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(2);
    });

    it('12. page=0 treated as page=1', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?page=0')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(1);
    });

    it('13. kyc_queue items have documents (aadhaar, gst, shop_photo)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?status=pending')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      if (res.body.data.kyc_queue.length > 0) {
        const item = res.body.data.kyc_queue[0];
        expect(item).toHaveProperty('documents');
        expect(item.documents).toHaveProperty('aadhaar');
        expect(item.documents).toHaveProperty('gst');
        expect(item.documents).toHaveProperty('shop_photo');
      }
    });

    it('14. kyc_queue items have required fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue?status=pending')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      if (res.body.data.kyc_queue.length > 0) {
        const item = res.body.data.kyc_queue[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('shop_id');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('submitted_at');
      }
    });

    it('15. total in meta is non-negative', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('16. pages in meta is non-negative', async () => {
      const res = await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.pages).toBeGreaterThanOrEqual(0);
    });

    it('17. returns 401 when no auth token', async () => {
      await request(app)
        .get('/api/v1/admin/kyc/queue')
        .expect(401);
    });

    it('18. returns 401 with invalid token', async () => {
      await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${invalidToken()}`)
        .expect(401);
    });

    it('19. returns 403 for customer role', async () => {
      await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });

    it('20. returns 403 for shop_owner role', async () => {
      await request(app)
        .get('/api/v1/admin/kyc/queue')
        .set('Authorization', `Bearer ${shopOwnerToken()}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /admin/kyc/:id/approve — Task 13.5.2
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/kyc/:id/approve (Task 13.5.2)', () => {
    let profileId, shopId, kycId;

    beforeEach(async () => {
      const profile = await createProfile();
      profileId = profile.id;
      const shop = await createShop(profileId, profile.phone);
      shopId = shop.id;
      const kyc = await createKYC(shopId, profileId, 'pending');
      kycId = kyc.id;
    });

    afterEach(async () => cleanup({ kycId, shopId, profileId }));

    it('21. approves KYC with optional notes → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ notes: 'Documents verified successfully.' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('22. approves KYC without notes → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({})
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('23. response has status=approved', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.status).toBe('approved');
    });

    it('24. response contains kyc_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.kyc_id).toBe(kycId);
    });

    it('25. response contains shop_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.shop_id).toBe(shopId);
    });

    it('26. response contains approved_at timestamp', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.approved_at).toBeDefined();
      expect(new Date(res.body.data.approved_at).getTime()).not.toBeNaN();
    });

    it('27. response contains admin_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.admin_id).toBeDefined();
    });

    it('28. updates kyc_submissions.status = approved in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('status')
        .eq('id', kycId)
        .single();
      expect(kyc?.status).toBe('approved');
    });

    it('29. updates shops.kyc_status = approved in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('kyc_status')
        .eq('id', shopId)
        .single();
      expect(shop?.kyc_status).toBe('approved');
    });

    it('30. returns 404 for non-existent KYC ID', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${uuidv4()}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('31. returns 401 without auth token', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .expect(401);
    });

    it('32. returns 401 with invalid token', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${invalidToken()}`)
        .expect(401);
    });

    it('33. returns 403 for customer role', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });

    it('34. returns 403 for shop_owner role', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${shopOwnerToken()}`)
        .expect(403);
    });

    it('35. notes > 500 chars returns 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/approve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ notes: 'x'.repeat(501) })
        .expect(400);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /admin/kyc/:id/reject — Task 13.5.3
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/kyc/:id/reject (Task 13.5.3)', () => {
    let profileId, shopId, kycId;

    beforeEach(async () => {
      const profile = await createProfile();
      profileId = profile.id;
      const shop = await createShop(profileId, profile.phone);
      shopId = shop.id;
      const kyc = await createKYC(shopId, profileId, 'pending');
      kycId = kyc.id;
    });

    afterEach(async () => cleanup({ kycId, shopId, profileId }));

    it('36. rejects KYC with valid reason → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Aadhaar document is blurry and unreadable.' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('37. response has status=rejected', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Documents are not legible at all.' })
        .expect(200);
      expect(res.body.data.status).toBe('rejected');
    });

    it('38. response contains kyc_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Invalid Aadhaar document provided.' })
        .expect(200);
      expect(res.body.data.kyc_id).toBe(kycId);
    });

    it('39. response contains shop_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'GST document missing completely.' })
        .expect(200);
      expect(res.body.data.shop_id).toBe(shopId);
    });

    it('40. response contains reason', async () => {
      const reason = 'Shop photo is not clear enough.';
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason })
        .expect(200);
      expect(res.body.data.reason).toBe(reason);
    });

    it('41. updates kyc_submissions.status = rejected in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Aadhaar card details are incomplete.' })
        .expect(200);
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('status')
        .eq('id', kycId)
        .single();
      expect(kyc?.status).toBe('rejected');
    });

    it('42. sets rejection_reason in DB', async () => {
      const reason = 'GST number does not match records.';
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason })
        .expect(200);
      const { data: kyc } = await supabase
        .from('kyc_submissions')
        .select('rejected_reason')
        .eq('id', kycId)
        .single();
      expect(kyc?.rejected_reason).toBe(reason);
    });

    it('43. missing reason → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({})
        .expect(400);
    });

    it('44. empty string reason → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: '' })
        .expect(400);
    });

    it('45. reason < 10 chars → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'short' })
        .expect(400);
    });

    it('46. reason exactly 10 chars → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: '1234567890' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('47. reason > 500 chars → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'x'.repeat(501) })
        .expect(400);
    });

    it('48. returns 404 for non-existent KYC ID', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${uuidv4()}/reject`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Some valid rejection reason here.' })
        .expect(404);
    });

    it('49. returns 401 without auth token', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .send({ reason: 'Document is not valid format.' })
        .expect(401);
    });

    it('50. returns 403 for customer role', async () => {
      await request(app)
        .patch(`/api/v1/admin/kyc/${kycId}/reject`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .send({ reason: 'Document is not valid format.' })
        .expect(403);
    });
  });
});
