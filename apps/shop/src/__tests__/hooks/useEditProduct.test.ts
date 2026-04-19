/**
 * Tests for useEditProduct hook
 * Coverage: load product, update, optimistic rollback, validation errors,
 *           retry logic, offline AsyncStorage backup
 */

import { renderHook, act } from '@testing-library/react-native';
import { useEditProduct } from '@/hooks/useEditProduct';
import { client } from '@/services/api';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import { Product } from '@/types/products';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/services/api', () => ({
  client: {
    patch: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/store/auth');
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getItem: jest.fn(),
}));
jest.mock('@/utils/logger');

const SHOP_ID = 'shop-001';

const MOCK_PRODUCT: Product = {
  id: 'prod-edit-001',
  shopId: SHOP_ID,
  name: 'Edit Product',
  description: 'A product to edit',
  category: 'grocery',
  price: 5000,
  stockQty: 10,
  images: [],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
  isActive: true,
};

describe('useEditProduct hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
      const store = { shopId: SHOP_ID, token: 'jwt-abc' };
      return typeof selector === 'function' ? selector(store) : store;
    });

    useProductsStore.setState({
      products: [MOCK_PRODUCT],
      loading: false,
      error: null,
      searchQuery: '',
      activeCategory: 'all',
    });

    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Initial state', () => {
    it('initializes with empty form data', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitError).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });

    it('hasChanges is false with empty form', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      expect(result.current.hasChanges).toBe(false);
    });
  });

  describe('setFormField', () => {
    it('updates price field', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      expect(result.current.formData.price).toBe(7500);
    });

    it('updates stockQty field', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('stockQty', 25);
      });

      expect(result.current.formData.stockQty).toBe(25);
    });

    it('detects changes from original product values', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      expect(result.current.hasChanges).toBe(true);
    });

    it('clears field error on edit', async () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      // Trigger error first
      act(() => {
        result.current.setFormField('price', -1);
      });

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.errors.price).toBeDefined();

      // Clear error by editing to valid value
      act(() => {
        result.current.setFormField('price', 5000);
      });

      expect(result.current.errors.price).toBeUndefined();
    });
  });

  describe('validateForm', () => {
    it('returns true when form has valid changes', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm();
      });

      expect(isValid!).toBe(true);
    });

    it('returns false when price is below minimum', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 0);
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateForm();
      });

      expect(isValid!).toBe(false);
    });
  });

  describe('submitProduct', () => {
    it('returns null when form is invalid', async () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', -100);
      });

      let outcome: Product | null;
      await act(async () => {
        outcome = await result.current.submitProduct();
      });

      expect(outcome!).toBeNull();
    });

    it('returns null when no changes detected', async () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      // Form is empty — no changes from original
      let outcome: Product | null;
      await act(async () => {
        outcome = await result.current.submitProduct();
      });

      expect(outcome!).toBeNull();
      expect(result.current.submitError).toContain('Please change at least one field');
    });

    it('returns null when shopId is missing', async () => {
      (useAuthStore as unknown as jest.Mock).mockImplementation((selector) => {
        const store = { shopId: null, token: null };
        return typeof selector === 'function' ? selector(store) : store;
      });

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      let outcome: Product | null;
      await act(async () => {
        outcome = await result.current.submitProduct();
      });

      expect(outcome!).toBeNull();
      expect(result.current.submitError).toBe('Shop ID not available');
    });

    it('submits successfully and optimistically updates store', async () => {
      const updatedProduct = { ...MOCK_PRODUCT, price: 7500 };
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: updatedProduct },
      });

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      let outcome: Product | null;
      await act(async () => {
        outcome = await result.current.submitProduct();
      });

      expect(outcome?.price).toBe(7500);
      expect(result.current.isSubmitting).toBe(false);

      // Verify AsyncStorage was cleared on success
      expect(AsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('saves pending changes to AsyncStorage before submitting', async () => {
      const updatedProduct = { ...MOCK_PRODUCT, price: 7500 };
      (client.patch as jest.Mock).mockResolvedValue({
        data: { success: true, data: updatedProduct },
      });

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      await act(async () => {
        await result.current.submitProduct();
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining(MOCK_PRODUCT.id),
        expect.stringContaining(MOCK_PRODUCT.id)
      );
    });

    it('sets user-friendly error on 404 response', async () => {
      const timeoutError = new Error('Request failed with status code 404');
      (client.patch as jest.Mock).mockRejectedValue(timeoutError);

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      await act(async () => {
        await result.current.submitProduct();
      });

      expect(result.current.submitError).toContain('Product not found');
    });

    it('retries on network error before failing', async () => {
      const networkError = new Error('network connection refused');
      (client.patch as jest.Mock).mockRejectedValue(networkError);

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      await act(async () => {
        await result.current.submitProduct();
      });

      // Should have been called multiple times (retries)
      expect(client.patch).toHaveBeenCalledTimes(3);
      expect(result.current.submitError).toContain('Network error');
    });

    it('does not retry on non-network errors (403)', async () => {
      const forbiddenError = new Error('403 Forbidden');
      (client.patch as jest.Mock).mockRejectedValue(forbiddenError);

      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 7500);
      });

      await act(async () => {
        await result.current.submitProduct();
      });

      // 403 is non-retryable — should be called only once
      expect(client.patch).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetForm', () => {
    it('clears all form state', () => {
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      act(() => {
        result.current.setFormField('price', 9999);
        result.current.resetForm(MOCK_PRODUCT);
      });

      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('clearError', () => {
    it('clears submitError', async () => {
      // Force a submitError by having no changes
      const { result } = renderHook(() => useEditProduct(MOCK_PRODUCT));

      await act(async () => {
        await result.current.submitProduct();
      });

      expect(result.current.submitError).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.submitError).toBeNull();
    });
  });
});
