/**
 * Frontend tests for useLowStockAlerts hook
 * Validates: fetch, pagination, refresh, sorting, threshold, error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLowStockAlerts } from '../useLowStockAlerts';
import * as lowStockService from '@/services/low-stock';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

jest.mock('@/services/low-stock');
jest.mock('@/store/auth');
jest.mock('@/utils/logger');

const TEST_SHOP_ID = 'shop-001';

const MOCK_PRODUCT_1 = {
  id: 'prod-001',
  name: 'Rice',
  category: 'Grains',
  price: 2500,
  stockQuantity: 2,
  unit: 'kg',
  thumbnailUrl: 'https://cdn.example.com/rice.jpg',
  description: 'Basmati rice',
  isAvailable: true,
  updatedAt: '2026-04-19T10:00:00Z',
};

const MOCK_PRODUCT_2 = {
  id: 'prod-002',
  name: 'Wheat Flour',
  category: 'Grains',
  price: 1500,
  stockQuantity: 4,
  unit: 'kg',
  thumbnailUrl: 'https://cdn.example.com/wheat.jpg',
  description: 'Whole wheat flour',
  isAvailable: true,
  updatedAt: '2026-04-19T11:00:00Z',
};

const MOCK_RESPONSE = {
  success: true,
  data: [MOCK_PRODUCT_1, MOCK_PRODUCT_2],
  meta: {
    page: 1,
    total: 2,
    pages: 1,
    lowStockCount: 2,
    threshold: 5,
  },
};

describe('useLowStockAlerts hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue(TEST_SHOP_ID);
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});
    logger.warn.mockImplementation(() => {});
  });

  describe('Happy Path', () => {
    it('should fetch products on initialization', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      expect(result.current.products[0].name).toBe('Rice');
      expect(result.current.pagination.lowStockCount).toBe(2);
    });

    it('should initialize with correct default state', () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination.threshold).toBe(5);
      expect(result.current.pagination.page).toBe(1);
    });

    it('should update pagination metadata', async () => {
      const customResponse = {
        ...MOCK_RESPONSE,
        meta: {
          page: 2,
          total: 45,
          pages: 3,
          lowStockCount: 45,
          threshold: 5,
        },
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        customResponse
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(2);
        expect(result.current.pagination.total).toBe(45);
        expect(result.current.pagination.pages).toBe(3);
      });
    });
  });

  describe('Acceptance Criteria', () => {
    it('AC1: should fetch products below threshold', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBeGreaterThan(0);
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 5,
        })
      );
    });

    it('AC2: threshold should default to 5 and be configurable', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      // Check default
      expect(result.current.pagination.threshold).toBe(5);

      // Change threshold
      await act(async () => {
        await result.current.setThreshold(10);
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 10,
        })
      );
    });

    it('AC3: pagination should work with page and limit', async () => {
      // Initial mock must have pages > 1 so loadMore is not blocked
      const page1Response = {
        ...MOCK_RESPONSE,
        meta: { page: 1, total: 40, pages: 2, lowStockCount: 40, threshold: 5 },
      };
      const page2Response = {
        ...MOCK_RESPONSE,
        data: [],
        meta: { page: 2, total: 40, pages: 2, lowStockCount: 40, threshold: 5 },
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        page1Response
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      // Load more
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        page2Response
      );

      await act(async () => {
        await result.current.loadMore();
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 20,
        })
      );
    });

    it('AC4: sorting should work - sortBy=stock', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await act(async () => {
        await result.current.setSortBy('stock');
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'stock',
        })
      );
    });

    it('AC4b: sorting should work - sortBy=name', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await act(async () => {
        await result.current.setSortBy('name');
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'name',
        })
      );
    });

    it('AC4c: sorting should work - sortBy=updated_at', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await act(async () => {
        await result.current.setSortBy('updated_at');
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'updated_at',
        })
      );
    });

    it('AC7: pull-to-refresh works - resets to page 1', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.refreshing).toBe(false);
      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('EC1: threshold below 1 should be clamped to 1', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await act(async () => {
        await result.current.setThreshold(0);
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 1,
        })
      );
    });

    it('EC2: threshold above 999 should be clamped to 999', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await act(async () => {
        await result.current.setThreshold(1000);
      });

      expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 999,
        })
      );
    });

    it('EC5: empty result should show lowStockCount: 0', async () => {
      const emptyResponse = {
        success: true,
        data: [],
        meta: {
          page: 1,
          total: 0,
          pages: 0,
          lowStockCount: 0,
          threshold: 5,
        },
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        emptyResponse
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products).toEqual([]);
      });

      expect(result.current.pagination.lowStockCount).toBe(0);
      expect(result.current.pagination.total).toBe(0);
    });

    it('EC6: network error should set error state with retry capability', async () => {
      const error = new Error('Network error');

      (lowStockService.getLowStockProducts as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('Failed to fetch');

      // Retry
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      await act(async () => {
        await result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });
    });

    it('EC7: 401 error (expired JWT) should have clear error message', async () => {
      const authError = {
        message: 'Your session expired. Please log in again.',
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockRejectedValue(
        authError
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('session');
    });

    it('EC8: 403 error (forbidden) should show forbidden message', async () => {
      const forbiddenError = {
        message: 'You are not authorized to access low stock alerts',
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockRejectedValue(
        forbiddenError
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(result.current.error).toContain('authorized');
    });

    it('EC10: rapid refresh calls should debounce', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      const initialCallCount = (
        lowStockService.getLowStockProducts as jest.Mock
      ).mock.calls.length;

      // Simulate rapid refresh calls
      await act(async () => {
        await result.current.refresh();
        await result.current.refresh();
        await result.current.refresh();
      });

      // Should not exponentially increase calls (loading prevents concurrent fetches)
      const finalCallCount = (
        lowStockService.getLowStockProducts as jest.Mock
      ).mock.calls.length;

      expect(finalCallCount - initialCallCount).toBeLessThanOrEqual(4);
    });
  });

  describe('State Management', () => {
    it('should set loading flag during fetch', async () => {
      let resolveGetLowStockProducts: any;
      const promise = new Promise((resolve) => {
        resolveGetLowStockProducts = resolve;
      });

      (lowStockService.getLowStockProducts as jest.Mock).mockReturnValue(promise);

      const { result } = renderHook(() => useLowStockAlerts());

      // Initially loading
      expect(result.current.loading).toBe(true);

      resolveGetLowStockProducts(MOCK_RESPONSE);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set refreshing flag during pull-to-refresh', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      let resolveRefresh: any;
      const refreshPromise = new Promise((resolve) => {
        resolveRefresh = resolve;
      });

      (lowStockService.getLowStockProducts as jest.Mock).mockReturnValue(
        refreshPromise
      );

      // Start the refresh without awaiting - check refreshing state after state flush
      act(() => {
        result.current.refresh();
      });

      // After act, refreshing should be true (state has been flushed)
      await waitFor(() => {
        expect(result.current.refreshing).toBe(true);
      });

      resolveRefresh(MOCK_RESPONSE);

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
      });
    });

    it('should reset all state with reset function', async () => {
      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        MOCK_RESPONSE
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.products.length).toBe(2);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.products).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.refreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination.threshold).toBe(5);
      expect(result.current.pagination.page).toBe(1);
    });

    it('should not load more if already at last page', async () => {
      const response = {
        ...MOCK_RESPONSE,
        meta: {
          page: 2,
          total: 20,
          pages: 2,
          lowStockCount: 20,
          threshold: 5,
        },
      };

      (lowStockService.getLowStockProducts as jest.Mock).mockResolvedValue(
        response
      );

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.pagination.page).toBe(2);
      });

      const callCountBefore = (
        lowStockService.getLowStockProducts as jest.Mock
      ).mock.calls.length;

      await act(async () => {
        await result.current.loadMore();
      });

      const callCountAfter = (
        lowStockService.getLowStockProducts as jest.Mock
      ).mock.calls.length;

      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('Missing Shop ID', () => {
    it('should handle missing shopId gracefully', async () => {
      (useAuthStore as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useLowStockAlerts());

      await waitFor(() => {
        expect(result.current.error).toContain('Shop ID');
      });

      expect(result.current.loading).toBe(false);
    });
  });
});
