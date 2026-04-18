/**
 * useProducts hook tests
 * Tests for product fetching, deletion, error handling, and retries
 */

import { renderHook, act } from '@testing-library/react-native';
import { useProducts } from '@/hooks/useProducts';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import * as productService from '@/services/products';

jest.mock('@/store/auth');
jest.mock('@/store/products');
jest.mock('@/services/products');
// Logger is mocked via manual mock in src/utils/__mocks__/logger.ts
// configured in jest.config.js moduleNameMapper

const mockProduct = {
  id: 'prod-1',
  shopId: 'shop-1',
  name: 'Test Product',
  description: 'A test product',
  category: 'Vegetables',
  price: 5000,
  stockQty: 10,
  images: [
    {
      id: 'img-1',
      productId: 'prod-1',
      url: 'https://example.com/product.jpg',
      isPrimary: true,
      uploadedAt: '2026-04-17T10:00:00Z',
    },
  ],
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  isActive: true,
};

const mockProductsListResponse = {
  success: true,
  data: [mockProduct],
  meta: { page: 1, total: 1, pages: 1 },
};

// Full store mock factory
function makeStoreMock(overrides = {}) {
  return {
    products: [],
    loading: false,
    error: null,
    setProducts: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    deleteProduct: jest.fn(),
    ...overrides,
  };
}

describe('useProducts hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all productService mocks
    (productService.getShopProducts as jest.Mock).mockClear();
    (productService.getProductDetail as jest.Mock).mockClear();
    (productService.deleteProduct as jest.Mock).mockClear();
    // Default auth mock - handles Zustand selector pattern
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { shopId: 'shop-1' };
      return typeof selector === 'function' ? selector(state) : state;
    });
    // Default store mock with empty products
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock();
      return typeof selector === 'function' ? selector(state) : state;
    });
  });

  test('initial state is correct', () => {
    const { result } = renderHook(() => useProducts());

    expect(result.current.products).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('fetches products successfully', async () => {
    const mockSetProducts = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock({ setProducts: mockSetProducts });
      return typeof selector === 'function' ? selector(state) : state;
    });
    (productService.getShopProducts as jest.Mock).mockResolvedValue(
      mockProductsListResponse
    );

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(productService.getShopProducts).toHaveBeenCalledWith(1, 50);
    expect(mockSetProducts).toHaveBeenCalledWith([mockProduct]);
  });

  test('returns products from store', () => {
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock({ products: [mockProduct] });
      return typeof selector === 'function' ? selector(state) : state;
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.products).toEqual([mockProduct]);
  });

  test('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch';
    const mockSetError = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock({ setError: mockSetError });
      return typeof selector === 'function' ? selector(state) : state;
    });
    (productService.getShopProducts as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    // Hook converts non-AppError to generic message
    expect(mockSetError).toHaveBeenCalledWith('Failed to fetch products');
  });

  test('fetches product detail', async () => {
    (productService.getProductDetail as jest.Mock).mockResolvedValue(
      mockProduct
    );

    const { result } = renderHook(() => useProducts());

    let detail;
    await act(async () => {
      detail = await result.current.fetchProductDetail('prod-1');
    });

    expect(detail).toEqual(mockProduct);
    expect(productService.getProductDetail).toHaveBeenCalledWith('prod-1');
  });

  test('deletes product and removes from store', async () => {
    const mockDeleteFromStore = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock({ deleteProduct: mockDeleteFromStore });
      return typeof selector === 'function' ? selector(state) : state;
    });
    (productService.deleteProduct as jest.Mock).mockResolvedValue({
      success: true,
    });

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.deleteProduct('prod-1');
    });

    expect(productService.deleteProduct).toHaveBeenCalledWith('prod-1');
    expect(mockDeleteFromStore).toHaveBeenCalledWith('prod-1');
  });

  test('handles delete error and rethrows', async () => {
    const errorMessage = 'Failed to delete';
    (productService.deleteProduct as jest.Mock).mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await expect(
        result.current.deleteProduct('prod-1')
      ).rejects.toThrow(errorMessage);
    });
  });

  test('retry calls fetchProducts', async () => {
    (productService.getShopProducts as jest.Mock).mockResolvedValue(
      mockProductsListResponse
    );

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.retry();
    });

    expect(productService.getShopProducts).toHaveBeenCalled();
  });

  test('does not fetch when shopId is null', async () => {
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = { shopId: null };
      return typeof selector === 'function' ? selector(state) : state;
    });

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(productService.getShopProducts).not.toHaveBeenCalled();
  });

  test('retries after error and succeeds', async () => {
    const mockSetProducts = jest.fn();
    const mockSetError = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = makeStoreMock({ setProducts: mockSetProducts, setError: mockSetError });
      return typeof selector === 'function' ? selector(state) : state;
    });

    (productService.getShopProducts as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockProductsListResponse);

    const { result } = renderHook(() => useProducts());

    // First call fails
    await act(async () => {
      await result.current.fetchProducts();
    });

    // Hook converts non-AppError to generic message
    expect(mockSetError).toHaveBeenCalledWith('Failed to fetch products');

    // Second call (retry) succeeds
    await act(async () => {
      await result.current.retry();
    });

    expect(mockSetProducts).toHaveBeenCalledWith([mockProduct]);
  });
});
