/**
 * Tests for useProducts hook
 * Coverage: loadProducts, search, toggleStock via store, delete product
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useProducts } from '@/hooks/useProducts';
import * as productsService from '@/services/products';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import { AppError } from '@/types/common';
import { Product } from '@/types/products';

jest.mock('@/services/products');
jest.mock('@/store/auth');
jest.mock('@/utils/logger');

const SHOP_ID = 'shop-001';

const MOCK_PRODUCT: Product = {
  id: 'prod-001',
  shopId: SHOP_ID,
  name: 'Test Product',
  description: 'A test product',
  category: 'grocery',
  price: 5000,
  stockQty: 10,
  images: [],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  isActive: true,
};

const MOCK_PRODUCTS_RESPONSE = {
  success: true,
  data: [MOCK_PRODUCT],
  meta: { page: 1, total: 1, pages: 1 },
};

describe('useProducts hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const store = {
        shopId: SHOP_ID,
        token: 'jwt-abc',
        isAuthenticated: true,
        phone: '9876543210',
        role: 'shop_owner',
      };
      return typeof selector === 'function' ? selector(store) : store;
    });
    (productsService.getShopProducts as jest.Mock).mockResolvedValue(
      MOCK_PRODUCTS_RESPONSE
    );

    // Reset products store before each test
    useProductsStore.setState({
      products: [],
      loading: false,
      error: null,
      searchQuery: '',
      activeCategory: 'all',
    });
  });

  describe('Initialization', () => {
    it('returns initial empty state', () => {
      const { result } = renderHook(() => useProducts());

      expect(result.current.products).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('fetches products on mount when shopId is available and store is empty', async () => {
      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.products).toHaveLength(1);
      });

      expect(productsService.getShopProducts).toHaveBeenCalledWith(1, 50);
    });

    it('does not fetch when products already in store', async () => {
      useProductsStore.setState({ products: [MOCK_PRODUCT] });

      renderHook(() => useProducts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(productsService.getShopProducts).not.toHaveBeenCalled();
    });

    it('does not fetch when shopId is null', async () => {
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const store = { shopId: null, token: null, isAuthenticated: false, phone: null, role: null };
        return typeof selector === 'function' ? selector(store) : store;
      });

      renderHook(() => useProducts());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(productsService.getShopProducts).not.toHaveBeenCalled();
    });
  });

  describe('fetchProducts', () => {
    it('sets loading true during fetch and false after', async () => {
      let resolvePromise!: (value: typeof MOCK_PRODUCTS_RESPONSE) => void;
      (productsService.getShopProducts as jest.Mock).mockReturnValue(
        new Promise((resolve) => { resolvePromise = resolve; })
      );

      // Start with empty store to trigger auto-fetch
      useProductsStore.setState({ products: [], loading: false, error: null });

      const { result } = renderHook(() => useProducts());

      // Loading should become true
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve the promise
      act(() => { resolvePromise(MOCK_PRODUCTS_RESPONSE); });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('populates products array on success', async () => {
      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.products).toHaveLength(1);
      });

      expect(result.current.products[0].id).toBe('prod-001');
    });

    it('sets error message on API failure', async () => {
      (productsService.getShopProducts as jest.Mock).mockRejectedValue(
        new AppError('PRODUCTS_FETCH_FAILED', 'Failed to fetch')
      );

      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch');
      });
    });

    it('passes page parameter to API call', async () => {
      const { result } = renderHook(() => useProducts());

      await waitFor(() => {
        expect(result.current.products).toHaveLength(1);
      });

      await act(async () => {
        await result.current.fetchProducts(2);
      });

      expect(productsService.getShopProducts).toHaveBeenCalledWith(2, 50);
    });
  });

  describe('fetchProductDetail', () => {
    it('fetches and returns a single product', async () => {
      (productsService.getProductDetail as jest.Mock).mockResolvedValue(MOCK_PRODUCT);

      const { result } = renderHook(() => useProducts());

      let product: Product | undefined;
      await act(async () => {
        product = await result.current.fetchProductDetail('prod-001');
      });

      expect(product?.id).toBe('prod-001');
      expect(productsService.getProductDetail).toHaveBeenCalledWith('prod-001');
    });

    it('throws error when product not found', async () => {
      (productsService.getProductDetail as jest.Mock).mockRejectedValue(
        new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404)
      );

      const { result } = renderHook(() => useProducts());

      await expect(
        act(async () => {
          await result.current.fetchProductDetail('missing-id');
        })
      ).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    });
  });

  describe('deleteProduct', () => {
    beforeEach(() => {
      useProductsStore.setState({ products: [MOCK_PRODUCT] });
    });

    it('removes product from store on success', async () => {
      (productsService.deleteProduct as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useProducts());

      await act(async () => {
        await result.current.deleteProduct('prod-001');
      });

      expect(result.current.products).toHaveLength(0);
    });

    it('sets error and rethrows on failure', async () => {
      (productsService.deleteProduct as jest.Mock).mockRejectedValue(
        new AppError('PRODUCT_DELETE_FAILED', 'Delete failed')
      );

      const { result } = renderHook(() => useProducts());

      await expect(
        act(async () => {
          await result.current.deleteProduct('prod-001');
        })
      ).rejects.toMatchObject({ code: 'PRODUCT_DELETE_FAILED' });

      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('retry', () => {
    it('retries fetching products', async () => {
      (productsService.getShopProducts as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );
      (productsService.getShopProducts as jest.Mock).mockResolvedValueOnce(
        MOCK_PRODUCTS_RESPONSE
      );

      const { result } = renderHook(() => useProducts());

      // Wait for initial failed fetch
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.products).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });
  });
});
