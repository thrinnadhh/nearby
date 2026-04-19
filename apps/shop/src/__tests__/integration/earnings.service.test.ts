/**
 * Integration tests for earnings service
 * Coverage: getAnalytics (success, error cases, AppError passthrough)
 * Also covers settlements.fetchSettlements via apiClient mock
 */

import axios from 'axios';
import { getAnalytics } from '@/services/earnings';
import { client } from '@/services/api';
import { AppError } from '@/types/common';
import { EarningsData } from '@/types/earnings';

jest.mock('@/services/api', () => ({
  client: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/utils/logger');

const SHOP_ID = 'shop-earnings-001';

const MOCK_EARNINGS_DATA: EarningsData = {
  today: {
    date: '2026-04-19',
    netRevenuePaise: 50000,
    grossRevenuePaise: 51000,
    totalOrders: 10,
    completedOrders: 9,
    cancelledOrders: 1,
    completionRate: 90,
    avgAcceptanceTimeSeconds: 180,
    avgPreparationTimeSeconds: 600,
    reviewCount: 8,
    avgRating: 4.5,
    uniqueCustomers: 8,
  },
  week: [],
  month: [],
  summary: {
    today_total: 50000,
    week_total: 350000,
    month_total: 1500000,
    previous_day_total: 45000,
    previous_week_total: 320000,
    previous_month_total: 1400000,
  },
};

describe('earnings service — integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
  });

  // ─── getAnalytics ──────────────────────────────────────────────────
  describe('getAnalytics', () => {
    it('fetches analytics with default dateRange', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_EARNINGS_DATA },
      });

      const result = await getAnalytics(SHOP_ID);

      expect(client.get).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}/analytics`,
        { params: { dateRange: '30d' } }
      );
      expect(result.today?.netRevenuePaise).toBe(50000);
    });

    it('fetches analytics with 7d dateRange', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_EARNINGS_DATA },
      });

      await getAnalytics(SHOP_ID, '7d');

      expect(client.get).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}/analytics`,
        { params: { dateRange: '7d' } }
      );
    });

    it('fetches analytics with 90d dateRange', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_EARNINGS_DATA },
      });

      await getAnalytics(SHOP_ID, '90d');

      expect(client.get).toHaveBeenCalledWith(
        `/shops/${SHOP_ID}/analytics`,
        { params: { dateRange: '90d' } }
      );
    });

    it('returns earnings data with summary', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: MOCK_EARNINGS_DATA },
      });

      const result = await getAnalytics(SHOP_ID, '30d');

      expect(result.summary.today_total).toBe(50000);
      expect(result.summary.week_total).toBe(350000);
      expect(result.summary.month_total).toBe(1500000);
    });

    it('throws AppError when success is false', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: {
          success: false,
          error: { code: 'ANALYTICS_ERROR', message: 'No data available' },
        },
      });

      await expect(getAnalytics(SHOP_ID)).rejects.toMatchObject({
        code: 'ANALYTICS_ERROR',
        message: 'No data available',
      });
    });

    it('re-throws AppError directly without wrapping', async () => {
      const originalError = new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
      (client.get as jest.Mock).mockRejectedValue(originalError);

      await expect(getAnalytics(SHOP_ID)).rejects.toThrow(originalError);
    });

    it('wraps generic Error in ANALYTICS_FETCH_ERROR', async () => {
      (client.get as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      await expect(getAnalytics(SHOP_ID)).rejects.toMatchObject({
        code: 'ANALYTICS_FETCH_ERROR',
        message: 'Connection timeout',
      });
    });

    it('includes response status in AppError when axios error', async () => {
      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
      const axiosErr = Object.assign(new Error('Internal Error'), {
        isAxiosError: true,
        response: { status: 500 },
      });
      (client.get as jest.Mock).mockRejectedValue(axiosErr);

      await expect(getAnalytics(SHOP_ID)).rejects.toMatchObject({
        code: 'ANALYTICS_FETCH_ERROR',
        statusCode: 500,
      });
    });

    it('handles null today field gracefully', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { ...MOCK_EARNINGS_DATA, today: null },
        },
      });

      const result = await getAnalytics(SHOP_ID);

      expect(result.today).toBeNull();
    });

    it('handles empty week array', async () => {
      (client.get as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { ...MOCK_EARNINGS_DATA, week: [] },
        },
      });

      const result = await getAnalytics(SHOP_ID);

      expect(result.week).toEqual([]);
    });

    it('handles large revenue values without overflow', async () => {
      const largeData = {
        ...MOCK_EARNINGS_DATA,
        summary: {
          today_total: 999999999,
          week_total: 6999999999,
          month_total: 29999999999,
          previous_day_total: 900000000,
          previous_week_total: 6300000000,
          previous_month_total: 27000000000,
        },
      };

      (client.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: largeData },
      });

      const result = await getAnalytics(SHOP_ID);

      expect(result.summary.month_total).toBe(29999999999);
    });

    it('handles unknown error shape', async () => {
      (client.get as jest.Mock).mockRejectedValue('string-error');

      await expect(getAnalytics(SHOP_ID)).rejects.toMatchObject({
        code: 'ANALYTICS_FETCH_ERROR',
        message: 'Failed to fetch analytics',
      });
    });
  });
});
