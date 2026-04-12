import { describe, it, expect, beforeAll, afterEach, jest } from '@jest/globals';
import AnalyticsService from '../../src/services/analytics.js';
import { v4 as uuidv4 } from 'uuid';

// Mock Supabase service
jest.mock('../../src/services/supabase.js', () => ({
  supabase: {
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('Analytics Service', () => {
  let shopId;
  let mockSupabase;

  beforeAll(async () => {
    shopId = uuidv4();
    const { supabase } = await import('../../src/services/supabase.js');
    mockSupabase = supabase;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('aggregateDailyMetrics', () => {
    it('should aggregate daily metrics for a shop', async () => {
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [
                {
                  id: uuidv4(),
                  status: 'delivered',
                  total_paise: 50000,
                  accepted_at: new Date().toISOString(),
                  delivered_at: new Date().toISOString(),
                  customer_id: uuidv4(),
                },
              ],
              error: null,
            }),
          };
        }
        if (table === 'shop_analytics') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                shop_id: shopId,
                total_orders: 1,
                completed_orders: 1,
                cancelled_orders: 0,
                auto_cancelled_orders: 0,
                gross_revenue_paise: 50000,
                net_revenue_paise: 46000,
                completion_rate: 100,
                avg_acceptance_time_seconds: 60,
                avg_preparation_time_seconds: 300,
                review_count: 0,
                avg_rating: null,
                unique_customers: 1,
              },
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await AnalyticsService.aggregateDailyMetrics(shopId);

      expect(result.shopId).toBe(shopId);
      expect(typeof result.totalOrders).toBe('number');
      expect(typeof result.completedOrders).toBe('number');
      expect(typeof result.grossRevenuePaise).toBe('number');
      expect(typeof result.completionRate).toBe('number');
    });

    it('should handle shops with no orders', async () => {
      const fakeShopId = uuidv4();
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        if (table === 'reviews') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        if (table === 'shop_analytics') {
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                shop_id: fakeShopId,
                total_orders: 0,
                completed_orders: 0,
                gross_revenue_paise: 0,
                completion_rate: 0,
              },
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await AnalyticsService.aggregateDailyMetrics(fakeShopId);

      expect(result.totalOrders).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });

  describe('getAnalytics', () => {
    it('should fetch analytics for date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'shop_analytics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  shop_id: shopId,
                  date: startDate.toISOString().split('T')[0],
                  total_orders: 5,
                  completed_orders: 4,
                  gross_revenue_paise: 100000,
                  completion_rate: 0.8,
                },
              ],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          upsert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const results = await AnalyticsService.getAnalytics(
        shopId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
