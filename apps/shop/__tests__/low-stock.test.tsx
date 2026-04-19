/**
 * Frontend tests for low stock alerts hooks, components, and service
 * Run: npm test -- __tests__/low-stock
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { useLowStockDismissal } from '@/hooks/useLowStockDismissal';
import * as lowStockService from '@/services/low-stock';
import { useAuthStore } from '@/store/auth';
import logger from '@/utils/logger';

// Mock services
jest.mock('@/services/low-stock');
jest.mock('@/store/auth');
jest.mock('@/utils/logger');

const mockLowStockProducts = [
  {
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Low Stock Item',
    description: 'Test item',
    category: 'grocery',
    price: 5000,
    stockQuantity: 2,
    unit: 'kg',
    isAvailable: true,
    imageUrl: null,
    thumbnailUrl: null,
    createdAt: '2026-04-19T10:00:00Z',
    updatedAt: '2026-04-19T10:00:00Z',
  },
  {
    id: 'prod-2',
    shopId: 'shop-1',
    name: 'Out of Stock',
    description: 'Test item 2',
    category: 'vegetable',
    price: 3000,
    stockQuantity: 0,
    unit: 'kg',
    isAvailable: true,
    imageUrl: null,
    thumbnailUrl: null,
    createdAt: '2026-04-19T10:00:00Z',
    updatedAt: '2026-04-19T10:00:00Z',
  },
];

const mockResponse = {
  success: true,
  data: mockLowStockProducts,
  meta: {
    page: 1,
    total: 2,
    pages: 1,
    lowStockCount: 2,
    threshold: 5,
  },
};

describe('useLowStockAlerts Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({ shopId: 'shop-1' });
  });

  test('should initialize with empty state', () => {
    const { result } = renderHook(() => useLowStockAlerts());

    expect(result.current.products).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.pagination.threshold).toBe(5);
  });

  test('should fetch products on mount', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalled();
    expect(result.current.products).toEqual(mockLowStockProducts);
  });

  test('should handle fetch error', async () => {
    const errorMessage = 'Network error';
    lowStockService.getLowStockProducts.mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useLowStockAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.products).toEqual([]);
  });

  test('should handle threshold change', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue({
      ...mockResponse,
      meta: { ...mockResponse.meta, threshold: 10 },
    });

    const { result } = renderHook(() => useLowStockAlerts());

    await act(async () => {
      await result.current.setThreshold(10);
    });

    await waitFor(() => {
      expect(result.current.pagination.threshold).toBe(10);
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 10 })
    );
  });

  test('should clamp threshold to valid range (1-999)', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    // Test lower bound
    await act(async () => {
      await result.current.setThreshold(0);
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 1 })
    );

    // Test upper bound
    lowStockService.getLowStockProducts.mockClear();

    await act(async () => {
      await result.current.setThreshold(5000);
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
      expect.objectContaining({ threshold: 999 })
    );
  });

  test('should handle sorting', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    await act(async () => {
      await result.current.setSortBy('name');
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'name' })
    );
  });

  test('should handle refresh and clear dismissals', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    await act(async () => {
      await result.current.refresh();
    });

    expect(lowStockService.getLowStockProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
  });

  test('should handle pagination load more', async () => {
    const pageOneResponse = {
      ...mockResponse,
      meta: { ...mockResponse.meta, page: 1, total: 40, pages: 2 },
    };

    const pageTwoResponse = {
      ...mockResponse,
      data: [mockLowStockProducts[0]],
      meta: { ...mockResponse.meta, page: 2, total: 40, pages: 2 },
    };

    lowStockService.getLowStockProducts.mockResolvedValueOnce(pageOneResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    lowStockService.getLowStockProducts.mockResolvedValueOnce(pageTwoResponse);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3);
    });
  });

  test('should not load more if already on last page', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue({
      ...mockResponse,
      meta: { ...mockResponse.meta, page: 1, pages: 1 },
    });

    const { result } = renderHook(() => useLowStockAlerts());

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    lowStockService.getLowStockProducts.mockClear();

    await act(async () => {
      await result.current.loadMore();
    });

    expect(lowStockService.getLowStockProducts).not.toHaveBeenCalled();
  });

  test('should reset state', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLowStockAlerts());

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.pagination.threshold).toBe(5);
  });
});

describe('useLowStockDismissal Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with empty dismissals', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.dismissals).toEqual({});
  });

  test('should check if product is dismissed', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await act(async () => {
      await result.current.dismissProduct('prod-1');
    });

    expect(result.current.isDismissed('prod-1')).toBe(true);
    expect(result.current.isDismissed('prod-2')).toBe(false);
  });

  test('should dismiss a product', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await act(async () => {
      await result.current.dismissProduct('prod-1', 'manual');
    });

    expect(result.current.dismissals).toHaveProperty('prod-1');
    expect(result.current.dismissals['prod-1']).toEqual({
      productId: 'prod-1',
      dismissedAt: expect.any(String),
      reason: 'manual',
    });
  });

  test('should undismiss a product', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await act(async () => {
      await result.current.dismissProduct('prod-1');
    });

    expect(result.current.isDismissed('prod-1')).toBe(true);

    await act(async () => {
      await result.current.undismissProduct('prod-1');
    });

    expect(result.current.isDismissed('prod-1')).toBe(false);
  });

  test('should clear all dismissals', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await act(async () => {
      await result.current.dismissProduct('prod-1');
      await result.current.dismissProduct('prod-2');
    });

    expect(Object.keys(result.current.dismissals)).toHaveLength(2);

    await act(async () => {
      await result.current.clearAllDismissals();
    });

    expect(result.current.dismissals).toEqual({});
  });

  test('should get active dismissals array', async () => {
    const { result } = renderHook(() => useLowStockDismissal());

    await act(async () => {
      await result.current.dismissProduct('prod-1');
      await result.current.dismissProduct('prod-2');
    });

    const active = result.current.getActiveDismissals();
    expect(active).toEqual(['prod-1', 'prod-2']);
  });
});

describe('getLowStockProducts Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.mockReturnValue({ shopId: 'shop-1' });
  });

  test('should fetch products with default parameters', async () => {
    lowStockService.getLowStockProducts.mockResolvedValue(mockResponse);

    const result = await lowStockService.getLowStockProducts();

    expect(result.data).toEqual(mockLowStockProducts);
    expect(result.meta.threshold).toBe(5);
  });

  test('should validate threshold parameter', () => {
    // Valid thresholds
    const validThresholds = [1, 5, 10, 500, 999];
    validThresholds.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(1);
      expect(t).toBeLessThanOrEqual(999);
    });
  });

  test('should validate limit parameter', () => {
    // Valid limits
    const validLimits = [1, 10, 20, 50, 100];
    validLimits.forEach((l) => {
      expect(l).toBeGreaterThanOrEqual(1);
      expect(l).toBeLessThanOrEqual(100);
    });
  });

  test('should handle missing shop ID', async () => {
    useAuthStore.mockReturnValue({ shopId: null });

    await expect(lowStockService.getLowStockProducts()).rejects.toThrow(
      'SHOP_ID_MISSING'
    );
  });

  test('should handle authentication errors', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    lowStockService.getLowStockProducts.mockRejectedValue(error);

    await expect(lowStockService.getLowStockProducts()).rejects.toThrow(
      'Unauthorized'
    );
  });

  test('should handle authorization errors', async () => {
    const error = new Error('Forbidden');
    error.response = { status: 403 };
    lowStockService.getLowStockProducts.mockRejectedValue(error);

    await expect(lowStockService.getLowStockProducts()).rejects.toThrow(
      'Forbidden'
    );
  });
});
