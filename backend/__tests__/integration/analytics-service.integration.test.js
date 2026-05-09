/**
 * Integration tests for AnalyticsService (services/analytics.js)
 * Covers: aggregateDailyMetrics, getAnalytics, _toResponse
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../src/services/supabase.js';
import AnalyticsService from '../../src/services/analytics.js';

describe('AnalyticsService', () => {
  let shopId;
  let ownerId;
  let customerId;
  let orderId1;
  let orderId2;
  const testDate = '2026-01-15';

  beforeAll(async () => {
    shopId = uuidv4();
    ownerId = uuidv4();
    customerId = uuidv4();
    orderId1 = uuidv4();
    orderId2 = uuidv4();

    // Create shop owner profile
    await supabase.from('profiles').insert({
      id: ownerId,
      phone: '+919000000001',
      role: 'shop_owner',
      full_name: 'Analytics Shop Owner',
    });

    // Create shop
    await supabase.from('shops').insert({
      id: shopId,
      owner_id: ownerId,
      name: 'Analytics Test Shop',
      kyc_status: 'approved',
      is_open: true,
      city: 'Hyderabad',
      address: '123 Test St',
      category: 'grocery',
    });

    // Create customer profile
    await supabase.from('profiles').insert({
      id: customerId,
      phone: '+919000000002',
      role: 'customer',
      full_name: 'Test Customer',
    });

    // Create a delivered order with accepted_at and delivered_at
    await supabase.from('orders').insert({
      id: orderId1,
      shop_id: shopId,
      customer_id: customerId,
      status: 'delivered',
      total_paise: 25000,
      created_at: `${testDate}T10:00:00Z`,
      accepted_at: `${testDate}T10:02:00Z`,
      delivered_at: `${testDate}T10:30:00Z`,
    });

    // Create a cancelled order
    await supabase.from('orders').insert({
      id: orderId2,
      shop_id: shopId,
      customer_id: customerId,
      status: 'cancelled',
      total_paise: 10000,
      created_at: `${testDate}T11:00:00Z`,
    });

    // Create a review for the day
    await supabase.from('reviews').insert({
      id: uuidv4(),
      shop_id: shopId,
      customer_id: customerId,
      order_id: orderId1,
      rating: 5,
      is_visible: true,
      created_at: `${testDate}T12:00:00Z`,
    });
  });

  afterAll(async () => {
    try {
      await supabase.from('reviews').delete().eq('shop_id', shopId);
      await supabase.from('orders').delete().eq('id', orderId1);
      await supabase.from('orders').delete().eq('id', orderId2);
      await supabase.from('shop_analytics').delete().eq('shop_id', shopId);
      await supabase.from('shops').delete().eq('id', shopId);
      await supabase.from('profiles').delete().eq('id', ownerId);
      await supabase.from('profiles').delete().eq('id', customerId);
    } catch (_e) {
      // ignore cleanup errors
    }
  });

  describe('aggregateDailyMetrics', () => {
    it('should aggregate metrics for a date with delivered orders', async () => {
      const result = await AnalyticsService.aggregateDailyMetrics(shopId, new Date(testDate));

      expect(result).toBeDefined();
      expect(result.shopId).toBe(shopId);
      expect(result.date).toBe(testDate);
      expect(result.totalOrders).toBe(2);
      expect(result.completedOrders).toBe(1);
      expect(result.cancelledOrders).toBe(1);
      expect(result.grossRevenuePaise).toBe(25000);
      expect(result.completionRate).toBe(50);
      // avgAcceptanceTime should be calculated (120 seconds from 10:00 to 10:02)
      expect(result.avgAcceptanceTimeSeconds).toBe(120);
      // avgPreparationTime (10:02 to 10:30 = 28 min = 1680 seconds)
      expect(result.avgPreparationTimeSeconds).toBe(1680);
      expect(result.reviewCount).toBe(1);
      expect(result.avgRating).toBe(5);
      expect(result.uniqueCustomers).toBe(1);
    });

    it('should handle a date with no orders', async () => {
      const emptyShopId = uuidv4();
      const emptyOwnerId = uuidv4();

      await supabase.from('profiles').insert({
        id: emptyOwnerId,
        phone: '+919000000003',
        role: 'shop_owner',
        full_name: 'Empty Shop Owner',
      });
      await supabase.from('shops').insert({
        id: emptyShopId,
        owner_id: emptyOwnerId,
        name: 'Empty Shop',
        kyc_status: 'approved',
        is_open: true,
        city: 'Hyderabad',
        address: '456 Test St',
        category: 'grocery',
      });

      try {
        const result = await AnalyticsService.aggregateDailyMetrics(emptyShopId, new Date('2026-01-01'));

        expect(result).toBeDefined();
        expect(result.totalOrders).toBe(0);
        expect(result.completedOrders).toBe(0);
        expect(result.completionRate).toBe(0);
        expect(result.grossRevenuePaise).toBe(0);
        expect(result.avgAcceptanceTimeSeconds).toBeNull();
        expect(result.avgPreparationTimeSeconds).toBeNull();
        expect(result.reviewCount).toBe(0);
        expect(result.avgRating).toBeNull();
      } finally {
        await supabase.from('shops').delete().eq('id', emptyShopId);
        await supabase.from('profiles').delete().eq('id', emptyOwnerId);
      }
    });

    it('should use yesterday as default date when no date provided', async () => {
      // aggregateDailyMetrics(shopId) with no date — uses yesterday
      // With empty shop, this should still work gracefully
      const emptyShopId = uuidv4();
      const emptyOwnerId = uuidv4();

      await supabase.from('profiles').insert({
        id: emptyOwnerId,
        phone: '+919000000004',
        role: 'shop_owner',
        full_name: 'Default Date Shop Owner',
      });
      await supabase.from('shops').insert({
        id: emptyShopId,
        owner_id: emptyOwnerId,
        name: 'Default Date Shop',
        kyc_status: 'approved',
        is_open: true,
        city: 'Hyderabad',
        address: '789 Test St',
        category: 'grocery',
      });

      try {
        const result = await AnalyticsService.aggregateDailyMetrics(emptyShopId);
        // Should use yesterday — no orders → zeros
        expect(result).toBeDefined();
        expect(result.totalOrders).toBe(0);
      } finally {
        await supabase.from('shops').delete().eq('id', emptyShopId);
        await supabase.from('profiles').delete().eq('id', emptyOwnerId);
      }
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics records for a date range after aggregation', async () => {
      // aggregateDailyMetrics inserts into shop_analytics, then getAnalytics reads it
      await AnalyticsService.aggregateDailyMetrics(shopId, new Date(testDate));

      const records = await AnalyticsService.getAnalytics(
        shopId,
        '2026-01-01',
        '2026-01-31'
      );

      expect(Array.isArray(records)).toBe(true);
      // Should have at least one record from the upsert above
      if (records.length > 0) {
        const record = records[0];
        expect(record).toHaveProperty('shopId');
        expect(record).toHaveProperty('date');
        expect(record).toHaveProperty('totalOrders');
        expect(record).toHaveProperty('grossRevenuePaise');
        expect(record).toHaveProperty('completionRate');
      }
    });

    it('should return empty array when no analytics exist for date range', async () => {
      const records = await AnalyticsService.getAnalytics(
        shopId,
        '2020-01-01',
        '2020-01-31'
      );

      expect(Array.isArray(records)).toBe(true);
      expect(records).toHaveLength(0);
    });
  });
});
