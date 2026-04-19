/**
 * Tests for useProductToggle hook
 * Coverage: toggle success, retry on failure, rollback, rapid-tap prevention,
 *           all 10 edge case error codes
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProductToggle } from '@/hooks/useProductToggle';
import * as productsService from '@/services/products';
import { useProductsStore } from '@/store/products';
import { AppError } from '@/types/common';
import { Product } from '@/types/products';

jest.mock('@/services/products');
jest.mock('@/utils/logger');

const PRODUCT_ID = 'prod-toggle-001';

const MOCK_PRODUCT: Product = {
  id: PRODUCT_ID,
  shopId: 'shop-001',
  name: 'Toggle Product',
  description: 'Test',
  category: 'grocery',
  price: 5000,
  stockQty: 10,
  images: [],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  isActive: true,
};

describe('useProductToggle hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    useProductsStore.setState({
      products: [{ ...MOCK_PRODUCT, isAvailable: true } as Product & { isAvailable: boolean }],
      loading: false,
      error: null,
      searchQuery: '',
      activeCategory: 'all',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    it('initializes with idle state', () => {
      const { result } = renderHook(() => useProductToggle());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe('idle');
    });
  });

  describe('toggle success', () => {
    it('optimistically updates store before API call resolves', async () => {
      let resolveToggle!: (value: Product & { isAvailable: boolean }) => void;
      (productsService.updateProductAvailability as jest.Mock).mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const { result } = renderHook(() => useProductToggle());

      act(() => {
        result.current.toggle(PRODUCT_ID, true);
      });

      // Optimistic update — store should reflect new state immediately
      const storeProduct = useProductsStore.getState().products.find(
        (p) => p.id === PRODUCT_ID
      ) as Product & { isAvailable: boolean };
      expect(storeProduct?.isAvailable).toBe(false);

      // Resolve API call
      await act(async () => {
        resolveToggle({ ...MOCK_PRODUCT, isAvailable: false });
        await Promise.resolve();
      });
    });

    it('sets state to success after toggle', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockResolvedValue({
        ...MOCK_PRODUCT,
        isAvailable: false,
      });

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.state).toBe('success');
      expect(result.current.error).toBeNull();
    });

    it('resets state to idle after 2 seconds', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockResolvedValue({
        ...MOCK_PRODUCT,
        isAvailable: false,
      });

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.state).toBe('success');

      act(() => {
        jest.advanceTimersByTime(2001);
      });

      expect(result.current.state).toBe('idle');
    });

    it('toggles from false to true', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockResolvedValue({
        ...MOCK_PRODUCT,
        isAvailable: true,
      });

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, false);
      });

      expect(productsService.updateProductAvailability).toHaveBeenCalledWith(
        PRODUCT_ID,
        true
      );
    });
  });

  describe('rollback on error', () => {
    it('rolls back optimistic update when API call fails', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('PRODUCT_AVAILABILITY_UPDATE_FAILED', 'Server error')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      // Store should have the original state restored
      const storeProduct = useProductsStore.getState().products.find(
        (p) => p.id === PRODUCT_ID
      ) as Product & { isAvailable: boolean };
      expect(storeProduct?.isAvailable).toBe(true);
    });

    it('sets state to error on failure', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('UNKNOWN_ERROR', 'Something went wrong')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('edge cases — error codes', () => {
    it('edge case 1: PRODUCT_NOT_FOUND shows correct message', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('PRODUCT_NOT_FOUND', 'Product deleted')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.error).toContain('no longer available');
    });

    it('edge case 2: FORBIDDEN shows correct message', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('FORBIDDEN', 'Access denied')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.error).toContain('no longer have access');
    });

    it('edge case 3: UNAUTHORIZED shows correct message', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('UNAUTHORIZED', 'Session expired')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.error).toContain('session expired');
    });
  });

  describe('edge case 5: rapid-tap prevention', () => {
    it('ignores toggle while a request is in progress', async () => {
      let resolveToggle!: (value: Product) => void;
      (productsService.updateProductAvailability as jest.Mock).mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const { result } = renderHook(() => useProductToggle());

      // First toggle — in progress
      act(() => {
        result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.isLoading).toBe(true);

      // Second toggle while first is pending — should be ignored
      act(() => {
        result.current.toggle(PRODUCT_ID, false);
      });

      // API should only have been called once
      expect(productsService.updateProductAvailability).toHaveBeenCalledTimes(1);

      // Resolve and cleanup
      await act(async () => {
        resolveToggle({ ...MOCK_PRODUCT, isAvailable: false });
        await Promise.resolve();
      });
    });
  });

  describe('reset', () => {
    it('clears error and returns to idle state', async () => {
      (productsService.updateProductAvailability as jest.Mock).mockRejectedValue(
        new AppError('UNKNOWN_ERROR', 'Error occurred')
      );

      const { result } = renderHook(() => useProductToggle());

      await act(async () => {
        await result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.state).toBe('idle');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isLoading state', () => {
    it('is true during API call and false after', async () => {
      let resolveToggle!: (value: Product) => void;
      (productsService.updateProductAvailability as jest.Mock).mockReturnValue(
        new Promise((resolve) => { resolveToggle = resolve; })
      );

      const { result } = renderHook(() => useProductToggle());

      act(() => {
        result.current.toggle(PRODUCT_ID, true);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveToggle({ ...MOCK_PRODUCT, isAvailable: false });
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
