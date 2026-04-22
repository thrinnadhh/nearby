/**
 * Sprint 13.5.4–13.5.6: Admin Shop Management Endpoints
 * Tests: GET /admin/shops, PATCH /admin/shops/:id/suspend, PATCH /admin/shops/:id/reinstate
 * Target: 42+ tests
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';

// ─── Token helpers ────────────────────────────────────────────────────────────
const makeToken = (role = 'admin') =>
  jwt.sign(
    { userId: uuidv4(), phone: '+919999999999', role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );

const adminToken = () => makeToken('admin');
const customerToken = () => makeToken('customer');
const shopOwnerToken = () => makeToken('shop_owner');

// ─── DB helpers ───────────────────────────────────────────────────────────────
const seq = { n: 0 };
const uniquePhone = () => '+91' + (8000000000 + ++seq.n).toString();

const createProfile = async (role = 'shop_owner') => {
  const id = uuidv4();
  await supabase.from('profiles').insert({ id, phone: uniquePhone(), role });
  return id;
};

const createShop = async (ownerId, overrides = {}) => {
  const id = uuidv4();
  await supabase.from('shops').insert({
    id,
    owner_id: ownerId,
    name: 'Admin Shop Test',
    category: 'Kirana',
    phone: uniquePhone(),
    kyc_status: 'approved',
    is_open: true,
    trust_score: 75,
    ...overrides,
  });
  return id;
};

const cleanup = async ({ shopId, profileId }) => {
  try {
    if (shopId) await supabase.from('shops').delete().eq('id', shopId);
    if (profileId) await supabase.from('profiles').delete().eq('id', profileId);
  } catch (_) {}
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Shop Management (13.5.4–13.5.6)', () => {
  let profileId, shopId;

  beforeEach(async () => {
    profileId = await createProfile();
    shopId = await createShop(profileId);
  });

  afterEach(async () => cleanup({ shopId, profileId }));

  // ══════════════════════════════════════════════════════════════════════════
  // GET /admin/shops — Task 13.5.4
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /admin/shops (Task 13.5.4)', () => {

    it('1. returns 200 with shops array', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.shops)).toBe(true);
    });

    it('2. returns meta object with page, total, pages, limit', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { meta } = res.body.data;
      expect(meta).toHaveProperty('page');
      expect(meta).toHaveProperty('total');
      expect(meta).toHaveProperty('pages');
      expect(meta).toHaveProperty('limit');
    });

    it('3. defaults to page=1, limit=20', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(20);
    });

    it('4. filter kyc_status=approved returns only approved', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?kyc_status=approved')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allApproved = res.body.data.shops.every(s => s.kyc_status === 'approved');
      expect(allApproved).toBe(true);
    });

    it('5. filter kyc_status=pending returns only pending', async () => {
      const pendingProfileId = await createProfile();
      const pendingShopId = await createShop(pendingProfileId, { kyc_status: 'pending' });
      const res = await request(app)
        .get('/api/v1/admin/shops?kyc_status=pending')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allPending = res.body.data.shops.every(s => s.kyc_status === 'pending');
      expect(allPending).toBe(true);
      await cleanup({ shopId: pendingShopId, profileId: pendingProfileId });
    });

    it('6. filter is_open=true returns only open shops', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?is_open=true')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allOpen = res.body.data.shops.every(s => s.is_open === true);
      expect(allOpen).toBe(true);
    });

    it('7. filter is_open=false returns only closed shops', async () => {
      const closedProfileId = await createProfile();
      const closedShopId = await createShop(closedProfileId, { is_open: false });
      const res = await request(app)
        .get('/api/v1/admin/shops?is_open=false')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allClosed = res.body.data.shops.every(s => s.is_open === false);
      expect(allClosed).toBe(true);
      await cleanup({ shopId: closedShopId, profileId: closedProfileId });
    });

    it('8. search=Admin returns shops with "Admin" in name', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?search=Admin')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shops.length).toBeGreaterThan(0);
    });

    it('9. sort=name works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?sort=name')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('10. sort=trust_score works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?sort=trust_score')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('11. sort=created_at works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?sort=created_at')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('12. custom limit=5 is respected', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?limit=5')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(5);
      expect(res.body.data.shops.length).toBeLessThanOrEqual(5);
    });

    it('13. limit=200 capped at 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?limit=200')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(100);
    });

    it('14. page=2 returns second page offset', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?page=2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(2);
    });

    it('15. shop items contain required fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      if (res.body.data.shops.length > 0) {
        const shop = res.body.data.shops[0];
        expect(shop).toHaveProperty('id');
        expect(shop).toHaveProperty('name');
        expect(shop).toHaveProperty('kyc_status');
        expect(shop).toHaveProperty('is_open');
        expect(shop).toHaveProperty('trust_score');
      }
    });

    it('16. total in meta is >= 0', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('17. returns 401 without auth token', async () => {
      await request(app).get('/api/v1/admin/shops').expect(401);
    });

    it('18. returns 403 for customer role', async () => {
      await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });

    it('19. returns 403 for shop_owner role', async () => {
      await request(app)
        .get('/api/v1/admin/shops')
        .set('Authorization', `Bearer ${shopOwnerToken()}`)
        .expect(403);
    });

    it('20. empty search string returns all shops', async () => {
      const res = await request(app)
        .get('/api/v1/admin/shops?search=')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.shops.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /admin/shops/:id/suspend — Task 13.5.5
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/shops/:id/suspend (Task 13.5.5)', () => {

    it('21. suspends a shop → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Hygiene complaints from customers.' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('22. response has status=suspended', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Multiple quality complaints.' })
        .expect(200);
      expect(res.body.data.status).toBe('suspended');
    });

    it('23. response contains shop_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Fraud suspected from customers.' })
        .expect(200);
      expect(res.body.data.shop_id).toBe(shopId);
    });

    it('24. response contains suspended_at timestamp', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Pending investigation outcome.' })
        .expect(200);
      expect(res.body.data.suspended_at).toBeDefined();
    });

    it('25. response contains reason', async () => {
      const reason = 'Violated platform terms of service.';
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason })
        .expect(200);
      expect(res.body.data.reason).toBe(reason);
    });

    it('26. sets is_open=false in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Customer safety concern raised.' })
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('is_open')
        .eq('id', shopId)
        .single();
      expect(shop?.is_open).toBe(false);
    });

    it('27. records suspension_reason in DB', async () => {
      const reason = 'Fraudulent activity reported.';
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason })
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('suspension_reason')
        .eq('id', shopId)
        .single();
      expect(shop?.suspension_reason).toBe(reason);
    });

    it('28. missing reason → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({})
        .expect(400);
    });

    it('29. reason < 10 chars → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'short' })
        .expect(400);
    });

    it('30. non-existent shop → 404', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${uuidv4()}/suspend`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ reason: 'Violation of community guidelines.' })
        .expect(404);
    });

    it('31. no auth token → 401', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .send({ reason: 'Violation of community guidelines.' })
        .expect(401);
    });

    it('32. customer role → 403', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/suspend`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .send({ reason: 'Violation of community guidelines.' })
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /admin/shops/:id/reinstate — Task 13.5.6
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/shops/:id/reinstate (Task 13.5.6)', () => {

    beforeEach(async () => {
      // Ensure shop is suspended before reinstate tests
      await supabase.from('shops').update({
        is_open: false,
        suspended_at: new Date().toISOString(),
        suspension_reason: 'Test suspension reason for reinstate.',
      }).eq('id', shopId);
    });

    it('33. reinstates suspended shop → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('34. response has status=reinstated', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.status).toBe('reinstated');
    });

    it('35. response contains shop_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.shop_id).toBe(shopId);
    });

    it('36. sets is_open=true in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('is_open')
        .eq('id', shopId)
        .single();
      expect(shop?.is_open).toBe(true);
    });

    it('37. clears suspended_at in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('suspended_at')
        .eq('id', shopId)
        .single();
      expect(shop?.suspended_at).toBeNull();
    });

    it('38. clears suspension_reason in DB', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const { data: shop } = await supabase
        .from('shops')
        .select('suspension_reason')
        .eq('id', shopId)
        .single();
      expect(shop?.suspension_reason).toBeNull();
    });

    it('39. non-suspended shop → 400', async () => {
      // First reinstate so shop is no longer suspended
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      // Second reinstate should fail
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(400);
    });

    it('40. non-existent shop → 404', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${uuidv4()}/reinstate`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('41. no auth token → 401', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .expect(401);
    });

    it('42. customer role → 403', async () => {
      await request(app)
        .patch(`/api/v1/admin/shops/${shopId}/reinstate`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });
  });
});
