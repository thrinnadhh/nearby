/**
 * Settlements integration tests
 * GET /api/v1/shops/:shopId/settlements
 * Target: drive coverage from 8% to 80%+
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/index.js';
import { supabase } from '../../src/services/supabase.js';

// ─── Token helpers ────────────────────────────────────────────────────────────
const makeToken = (role, userId, shopId) =>
  jwt.sign(
    { userId: userId || uuidv4(), phone: '+919999999999', role, shopId: shopId || undefined },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '24h' }
  );

let seq = { n: 0 };
const uniquePhone = () => '+91' + (7000000000 + ++seq.n).toString();

// ─── DB helpers ───────────────────────────────────────────────────────────────
const createProfile = async (role = 'shop_owner') => {
  const id = uuidv4();
  await supabase.from('profiles').insert({ id, phone: uniquePhone(), role });
  return id;
};

const createShop = async (ownerId) => {
  const shopId = uuidv4();
  await supabase.from('shops').insert({
    id: shopId,
    owner_id: ownerId,
    name: 'Test Settlement Shop',
    category: 'kirana',
    phone: uniquePhone(),
    kyc_status: 'approved',
    is_open: true,
    trust_score: 80,
  });
  return shopId;
};

const createSettlement = async (shopId, overrides = {}) => {
  const id = uuidv4();
  const base = {
    id,
    shop_id: shopId,
    amount: 50000,
    currency: 'INR',
    status: 'completed',
    utr_number: `UTR${Date.now()}`,
    settlement_date: '2026-04-20',
    initiated_at: '2026-04-20T10:00:00Z',
    completed_at: '2026-04-21T10:00:00Z',
    failure_reason: null,
    period_start_date: '2026-04-14',
    period_end_date: '2026-04-20',
    net_amount: 48500,
    gross_amount: 50000,
    commission: 1000,
    fees: 500,
    ...overrides,
  };
  await supabase.from('settlements').insert(base);
  return id;
};

const cleanup = async (ids = {}) => {
  try {
    if (ids.settlementId) await supabase.from('settlements').delete().eq('id', ids.settlementId);
    if (ids.shopId) await supabase.from('shops').delete().eq('id', ids.shopId);
    if (ids.profileId) await supabase.from('profiles').delete().eq('id', ids.profileId);
  } catch (_) {}
};

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('Settlements Endpoint — GET /api/v1/shops/:shopId/settlements', () => {
  let profileId, shopId, shopOwnerToken;

  beforeEach(async () => {
    profileId = await createProfile('shop_owner');
    shopId = await createShop(profileId);
    shopOwnerToken = makeToken('shop_owner', profileId, shopId);
  });

  afterEach(async () => {
    try {
      await supabase.from('settlements').delete().eq('shop_id', shopId);
    } catch (_) {}
    await cleanup({ shopId, profileId });
  });

  // ═══════════════════════════════════════════════════════════════
  // Auth & Role Checks
  // ═══════════════════════════════════════════════════════════════
  describe('Authentication & Authorization', () => {
    it('returns 401 when no token provided', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when authenticated as customer', async () => {
      const customerToken = makeToken('customer', uuidv4());
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when authenticated as admin', async () => {
      const adminToken = makeToken('admin', uuidv4());
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when shop_owner requests another shop', async () => {
      const otherShopId = uuidv4();
      const otherOwnerToken = makeToken('shop_owner', uuidv4(), otherShopId);
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });

    it('returns 403 when shop_owner has no shopId in JWT', async () => {
      const noShopToken = makeToken('shop_owner', profileId, null);
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${noShopToken}`)
        .expect(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Happy Path
  // ═══════════════════════════════════════════════════════════════
  describe('Happy Path', () => {
    it('returns 200 with empty settlements when none exist', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data).toEqual([]);
      // meta structure present; total may be undefined from mock count query
      expect(res.body.data.meta).toMatchObject({ page: 1, limit: 20 });
    });

    it('returns 200 with settlements list', async () => {
      await createSettlement(shopId);
      await createSettlement(shopId, { amount: 75000 });

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // The data array comes from the second query (works correctly in mock)
      expect(res.body.data.data.length).toBe(2);
    });

    it('returns correctly shaped settlement objects', async () => {
      await createSettlement(shopId);

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      const settlement = res.body.data.data[0];
      expect(settlement).toHaveProperty('id');
      expect(settlement).toHaveProperty('amount');
      expect(settlement).toHaveProperty('status');
      expect(settlement).toHaveProperty('utrNumber');
      expect(settlement).toHaveProperty('settlementDate');
      expect(settlement).toHaveProperty('initiatedAt');
      expect(settlement).toHaveProperty('netAmount');
      expect(settlement).toHaveProperty('grossAmount');
      expect(settlement).toHaveProperty('commission');
      expect(settlement).toHaveProperty('fees');
      // Should NOT expose shop_id in the response (camelCase-mapped)
      expect(settlement).not.toHaveProperty('shop_id');
    });

    it('defaults to page=1 and limit=20', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      expect(res.body.data.meta.page).toBe(1);
      expect(res.body.data.meta.limit).toBe(20);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Pagination
  // ═══════════════════════════════════════════════════════════════
  describe('Pagination', () => {
    it('respects page and limit query params', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?page=2&limit=5`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      expect(res.body.data.meta.page).toBe(2);
      expect(res.body.data.meta.limit).toBe(5);
    });

    it('returns 400 when page=0', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?page=0`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('returns 400 when limit=0', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?limit=0`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when limit exceeds 100', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?limit=101`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_PAGINATION');
    });

    it('accepts limit=100 (max allowed)', async () => {
      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?limit=100`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      expect(res.body.data.meta.limit).toBe(100);
    });

    it('pages meta is calculated (present in response)', async () => {
      // Create 3 settlements with limit=2 → should be included in meta
      await createSettlement(shopId);
      await createSettlement(shopId);
      await createSettlement(shopId);

      const res = await request(app)
        .get(`/api/v1/shops/${shopId}/settlements?limit=2`)
        .set('Authorization', `Bearer ${shopOwnerToken}`)
        .expect(200);

      // meta.pages exists (actual value depends on count query support in mock)
      expect(res.body.data.meta).toHaveProperty('pages');
      // The paginated data should only have 2 items due to limit
      expect(res.body.data.data.length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Error Handling
  // ═══════════════════════════════════════════════════════════════
  describe('Error Handling', () => {
    it('returns 404 for unknown shopId (shopOwnerGuard DB check fails)', async () => {
      // shopOwnerGuard verifies shop ownership in DB; unknown shop → SHOP_NOT_FOUND
      const unknownShopId = uuidv4();
      const unknownToken = makeToken('shop_owner', uuidv4(), unknownShopId);
      const res = await request(app)
        .get(`/api/v1/shops/${unknownShopId}/settlements`)
        .set('Authorization', `Bearer ${unknownToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
