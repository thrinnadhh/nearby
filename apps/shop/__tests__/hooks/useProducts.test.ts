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

const mockProduct = {
  id: 'prod-1',
  shopId: 'shop-1',
  name: 'Test Product',
  description: 'A test product',
  category: 'Vegetables',
  price: 5000,
  stockQty: 10,
  images: [
    { id: 'img-1', productId: 'prod-1', url: 'https://example.com/product.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' },
  ],
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  isActive: true,
};

describe('useProducts hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches products on mount', async () => {
    const mockFetchProducts = jest.fn().mockResolvedValue([mockProduct]);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });
    (productService.getShopProducts as jest.Mock).mockResolvedValue([mockProduct]);

    const { result } = renderHook(() => useProducts());

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.products).toEqual([mockProduct]);
    expect(result.current.error).toBeNull();
  });

  test('handles fetch error', async () => {
    const errorMessage = 'Failed to fetch';
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });
    (productService.getShopProducts as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.products).toEqual([]);
  });

  test('fetches product detail', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });
    (productService.getProductDetail as jest.Mock).mockResolvedValue(mockProduct);

    const { result } = renderHook(() => useProducts());

    let detail;
    await act(async () => {
      detail = await result.current.fetchProductDetail('prod-1');
    });

    expect(detail).toEqual(mockProduct);
  });

  test('deletes product', async () => {
    const mockDeleteProduct = jest.fn().mockResolvedValue({ success: true });
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ removeProduct: jest.fn() });
    (productService.deleteProduct as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.deleteProduct('prod-1');
    });

    expect(productService.deleteProduct).toHaveBeenCalledWith('prod-1');
  });

  test('handles delete error', async () => {
    const errorMessage = 'Failed to delete';
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ removeProduct: jest.fn() });
    (productService.deleteProduct as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      try {
        await result.current.deleteProduct('prod-1');
      } catch (error) {
        expect((error as Error).message).toBe(errorMessage);
      }
    });
  });

  test('retries fetch on error', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });
    (productService.getShopProducts as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockProduct]);

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.products).toEqual([mockProduct]);
    expect(result.current.error).toBeNull();
  });

  test('validates shopId before fetching', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: null });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });

    const { result } = renderHook(() => useProducts());

    await act(async () => {
      try {
        await result.current.fetchProducts();
      } catch (error) {
        expect((error as Error).message).toContain('shopId');
      }
    });
  });

  test('initial state is correct', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: { id: 'user-1' }, shopId: 'shop-1' });
    (useProductsStore as unknown as jest.Mock).mockReturnValue({ setProducts: jest.fn() });

    const { result } = renderHook(() => useProducts());

    expect(result.current.products).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
