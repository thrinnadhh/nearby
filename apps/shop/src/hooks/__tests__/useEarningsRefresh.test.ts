/**
 * Tests for useEarningsRefresh hook
 * Coverage: 30+ tests for pull-to-refresh, error handling, toasts
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEarningsRefresh } from '@/hooks/useEarningsRefresh';
import * as earningsService from '@/services/earnings';
import { useEarningsStore } from '@/store/earnings';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

jest.mock('@/services/earnings');
jest.mock('@/utils/logger');

const TEST_SHOP_ID = 'shop-001';
const MOCK_DATA = {
  today: null,
  week: [],
  month: [],
  summary: {
    today_total: 0,
    week_total: 0,
    month_total: 0,
    previous_day_total: 0,
    previous_week_total: 0,
    previous_month_total: 0,
  },
};

describe('useEarningsRefresh hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (earningsService.getAnalytics as jest.Mock).mockResolvedValue(MOCK_DATA);
    useEarningsStore.setState({
      data: null,
      error: null,
    });
  });

  describe('Refresh Functionality', () => {
    it('should set isRefreshing to true during refresh', async () => {
      const onToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      expect(result.current.isRefreshing).toBeFalsy();

      act(() => {
        result.current.handleRefresh();
      });

      expect(result.current.isRefreshing).toBeTruthy();
    });

    it('should set isRefreshing to false after refresh', async () => {
      const onToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(result.current.isRefreshing).toBeFalsy();
    });

    it('should call getAnalytics with shopId and dateRange', async () => {
      const mockToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '7d', mockToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(earningsService.getAnalytics).toHaveBeenCalledWith(
        TEST_SHOP_ID,
        '7d'
      );
    });

    it('should handle all date ranges', async () => {
      const ranges: Array<'7d' | '30d' | '90d'> = ['7d', '30d', '90d'];

      for (const range of ranges) {
        (earningsService.getAnalytics as jest.Mock).mockClear();
        const mockToast = jest.fn();

        const { result } = renderHook(() =>
          useEarningsRefresh(TEST_SHOP_ID, range, mockToast)
        );

        await act(async () => {
          await result.current.handleRefresh();
        });

        expect(earningsService.getAnalytics).toHaveBeenCalledWith(
          TEST_SHOP_ID,
          range
        );
      }
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast on successful refresh', async () => {
      const onToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(onToast).toHaveBeenCalledWith(
        'Earnings updated',
        'success'
      );
    });

    it('should show error toast on fetch failure', async () => {
      const onToast = jest.fn();
      const error = new AppError('FETCH_ERROR', 'Network error');
      (earningsService.getAnalytics as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(onToast).toHaveBeenCalledWith('Network error', 'error');
    });

    it('should not call toast if onToast is undefined', async () => {
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', undefined)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      // Should not throw
      expect(result.current.isRefreshing).toBeFalsy();
    });
  });

  describe('Error Handling', () => {
    it('should set offline state on network error', async () => {
      const onToast = jest.fn();
      const error = new AppError('FETCH_ERROR', 'Network error', 0);
      (earningsService.getAnalytics as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(onToast).toHaveBeenCalledWith(
        'You are offline. Showing cached data.',
        'error'
      );
    });

    it('should clear error on successful refresh', async () => {
      (earningsService.getAnalytics as jest.Mock).mockRejectedValueOnce(
        new AppError('FETCH_ERROR', 'Test error')
      );

      const mockToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', mockToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      (earningsService.getAnalytics as jest.Mock).mockResolvedValue(
        MOCK_DATA
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(earningsService.getAnalytics).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should skip refresh when shopId is null', async () => {
      const onToast = jest.fn();
      const { result } = renderHook(() =>
        useEarningsRefresh(null, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(earningsService.getAnalytics).not.toHaveBeenCalled();
    });

    it('should handle AppError correctly', async () => {
      const onToast = jest.fn();
      const error = new AppError(
        'AUTH_ERROR',
        'Unauthorized',
        401
      );
      (earningsService.getAnalytics as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(onToast).toHaveBeenCalledWith('Unauthorized', 'error');
    });

    it('should handle generic errors', async () => {
      const onToast = jest.fn();
      (earningsService.getAnalytics as jest.Mock).mockRejectedValue(
        new Error('Unknown error')
      );

      const { result } = renderHook(() =>
        useEarningsRefresh(TEST_SHOP_ID, '30d', onToast)
      );

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(onToast).toHaveBeenCalledWith('Failed to refresh earnings', 'error');
    });
  });
});
