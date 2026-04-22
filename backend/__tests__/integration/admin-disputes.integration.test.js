/**
 * Sprint 13.5.9–13.5.11: Admin Dispute Management Endpoints
 * Tests: GET /admin/disputes, GET /admin/disputes/:id, PATCH /admin/disputes/:id/resolve
 * Target: 40+ tests
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
const uniquePhone = () => '+91' + (6000000000 + ++seq.n).toString();

const createProfile = async (role = 'shop_owner') => {
  const id = uuidv4();
  await supabase.from('profiles').insert({ id, phone: uniquePhone(), role });
  return id;
};

const createShop = async (ownerId) => {
  const id = uuidv4();
  await supabase.from('shops').insert({
    id,
    owner_id: ownerId,
    name: 'Dispute Test Shop',
    category: 'Kirana',
    phone: uniquePhone(),
    is_open: true,
  });
  return id;
};

const createOrder = async (customerId, shopId) => {
  const id = uuidv4();
  await supabase.from('orders').insert({
    id,
    customer_id: customerId,
    shop_id: shopId,
    status: 'delivered',
    total_amount: 50000,
    payment_id: 'cf_pay_test_123',
  });
  return id;
};

const createDispute = async (orderId, customerId, shopId, status = 'open') => {
  const id = uuidv4();
  await supabase.from('disputes').insert({
    id,
    order_id: orderId,
    customer_id: customerId,
    shop_id: shopId,
    reason: 'Items were not delivered to address.',
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return id;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Dispute Management (13.5.9–13.5.11)', () => {
  let shopProfileId, customerProfileId, shopId, orderId, disputeId;

  beforeEach(async () => {
    shopProfileId = await createProfile('shop_owner');
    customerProfileId = await createProfile('customer');
    shopId = await createShop(shopProfileId);
    orderId = await createOrder(customerProfileId, shopId);
    disputeId = await createDispute(orderId, customerProfileId, shopId, 'open');
  });

  afterEach(async () => {
    try {
      if (disputeId) await supabase.from('disputes').delete().eq('id', disputeId);
      if (orderId) await supabase.from('orders').delete().eq('id', orderId);
      if (shopId) await supabase.from('shops').delete().eq('id', shopId);
      if (shopProfileId) await supabase.from('profiles').delete().eq('id', shopProfileId);
      if (customerProfileId) await supabase.from('profiles').delete().eq('id', customerProfileId);
    } catch (_) {}
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /admin/disputes — Task 13.5.9
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /admin/disputes (Task 13.5.9)', () => {

    it('1. returns 200 with disputes array', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.disputes)).toBe(true);
    });

    it('2. returns meta with page, total, pages, limit', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
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
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(20);
    });

    it('4. filters by status=open returns only open disputes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?status=open')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allOpen = res.body.data.disputes.every(d => d.status === 'open');
      expect(allOpen).toBe(true);
    });

    it('5. filters by status=resolved', async () => {
      const resolvedDisputeId = await createDispute(orderId, customerProfileId, shopId, 'resolved');
      const res = await request(app)
        .get('/api/v1/admin/disputes?status=resolved')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      const allResolved = res.body.data.disputes.every(d => d.status === 'resolved');
      expect(allResolved).toBe(true);
      await supabase.from('disputes').delete().eq('id', resolvedDisputeId);
    });

    it('6. sort=created_at works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?sort=created_at')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('7. sort=updated_at works without error', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?sort=updated_at')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('8. custom limit=10 is respected', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?limit=10')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(10);
      expect(res.body.data.disputes.length).toBeLessThanOrEqual(10);
    });

    it('9. limit=200 capped at 100', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?limit=200')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.limit).toBe(100);
    });

    it('10. page=2 returns page 2 offset', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?page=2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.page).toBe(2);
    });

    it('11. dispute items have required fields', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?status=open')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      if (res.body.data.disputes.length > 0) {
        const dispute = res.body.data.disputes[0];
        expect(dispute).toHaveProperty('id');
        expect(dispute).toHaveProperty('status');
        expect(dispute).toHaveProperty('reason');
        expect(dispute).toHaveProperty('customer_id');
        expect(dispute).toHaveProperty('order_id');
        expect(dispute).toHaveProperty('created_at');
      }
    });

    it('12. total in meta is >= 0', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.meta.total).toBeGreaterThanOrEqual(0);
    });

    it('13. returns 401 without auth token', async () => {
      await request(app).get('/api/v1/admin/disputes').expect(401);
    });

    it('14. returns 403 for customer role', async () => {
      await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });

    it('15. returns 403 for shop_owner role', async () => {
      await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${shopOwnerToken()}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /admin/disputes/:id — Task 13.5.10
  // ══════════════════════════════════════════════════════════════════════════
  describe('GET /admin/disputes/:id (Task 13.5.10)', () => {

    it('16. returns 200 for existing dispute', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('17. response contains dispute detail object', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('dispute');
    });

    it('18. dispute.id matches requested ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.id).toBe(disputeId);
    });

    it('19. dispute.customer_id matches test customer', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.customer_id).toBe(customerProfileId);
    });

    it('20. dispute.order_id matches test order', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.order_id).toBe(orderId);
    });

    it('21. dispute.status is "open"', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.status).toBe('open');
    });

    it('22. response contains order_timeline array', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(Array.isArray(res.body.data.order_timeline)).toBe(true);
    });

    it('23. response contains gps_trail array', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(Array.isArray(res.body.data.gps_trail)).toBe(true);
    });

    it('24. dispute.reason is present', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.reason).toBeDefined();
    });

    it('25. dispute.shop_id is present', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(200);
      expect(res.body.data.dispute.shop_id).toBe(shopId);
    });

    it('26. returns 404 for non-existent dispute', async () => {
      await request(app)
        .get(`/api/v1/admin/disputes/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .expect(404);
    });

    it('27. returns 401 without auth token', async () => {
      await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .expect(401);
    });

    it('28. returns 403 for customer role', async () => {
      await request(app)
        .get(`/api/v1/admin/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .expect(403);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PATCH /admin/disputes/:id/resolve — Task 13.5.11
  // ══════════════════════════════════════════════════════════════════════════
  describe('PATCH /admin/disputes/:id/resolve (Task 13.5.11)', () => {

    it('29. approves dispute with refund → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 50000 })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('30. response has decision=approve', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 50000 })
        .expect(200);
      expect(res.body.data.decision).toBe('approve');
    });

    it('31. denies dispute → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.decision).toBe('deny');
    });

    it('32. partial refund (amount < total) → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 25000 })
        .expect(200);
      expect(res.body.data.refund_amount).toBe(25000);
    });

    it('33. response contains dispute_id', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(200);
      expect(res.body.data.dispute_id).toBe(disputeId);
    });

    it('34. response contains resolved_at timestamp', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(200);
      expect(res.body.data.resolved_at).toBeDefined();
    });

    it('35. response contains refund_amount', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 30000 })
        .expect(200);
      expect(res.body.data.refund_amount).toBe(30000);
    });

    it('36. updates dispute status in DB after resolution', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 50000 })
        .expect(200);
      const { data: dispute } = await supabase
        .from('disputes')
        .select('status')
        .eq('id', disputeId)
        .single();
      expect(['resolved', 'closed']).toContain(dispute?.status);
    });

    it('37. invalid decision value → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'maybe', refund_amount: 0 })
        .expect(400);
    });

    it('38. missing decision field → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ refund_amount: 0 })
        .expect(400);
    });

    it('39. missing refund_amount field → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve' })
        .expect(400);
    });

    it('40. refund_amount=-1 (negative) → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: -1 })
        .expect(400);
    });

    it('41. refund_amount > order total → 400', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 99999 })
        .expect(400);
    });

    it('42. refund_amount=0 with approve → 200 (no refund triggered)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'approve', refund_amount: 0 })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('43. optional notes field accepted → 200', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'deny', refund_amount: 0, notes: 'Customer was compensated offline.' })
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('44. non-existent dispute → 404', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${uuidv4()}/resolve`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(404);
    });

    it('45. no auth token → 401', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(401);
    });

    it('46. customer role → 403', async () => {
      await request(app)
        .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${customerToken()}`)
        .send({ decision: 'deny', refund_amount: 0 })
        .expect(403);
    });
  });
});
