/**
 * Tests for useEditProduct hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEditProduct } from '@/hooks/useEditProduct';
import { useProductsStore } from '@/store/products';
import { useAuthStore } from '@/store/auth';
import * as apiClient from '@/services/api';
import { Product } from '@/types/products';

jest.mock('@/services/api');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Properly mock Zustand stores
jest.mock('@/store/products', () => ({
  useProductsStore: jest.fn(),
}));

jest.mock('@/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

describe('useEditProduct hook', () => {
  const mockProduct: Product = {
    id: 'product-123',
    shopId: 'shop-123',
    name: 'Test Product',
    description: 'Test description',
    category: 'vegetable',
    price: 10000,
    stockQty: 50,
    images: [],
    createdAt: '2026-03-28T11:30:00Z',
    updatedAt: '2026-03-28T11:30:00Z',
    isActive: true,
    isAvailable: true,
  };

  const mockUpdateProduct = jest.fn();
  const mockShopId = 'shop-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (useProductsStore as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          updateProduct: mockUpdateProduct,
          deleteProduct: jest.fn(),
          addProduct: jest.fn(),
        });
      }
      return {
        updateProduct: mockUpdateProduct,
      };
    });

    (useAuthStore as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          shopId: mockShopId,
        });
      }
      return {
        shopId: mockShopId,
      };
    });
  });

  it('should initialize with empty form data', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    expect(result.current.formData).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBeNull();
    expect(result.current.hasChanges).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('should update price field', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
    });

    expect(result.current.formData.price).toBe(15000);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should update stock field', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('stockQty', 30);
    });

    expect(result.current.formData.stockQty).toBe(30);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should clear errors when field changes', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    // Set invalid price and validate
    act(() => {
      result.current.setFormField('price', 0);
    });

    // Wait for deferred validation from useEffect
    await waitFor(() => {
      expect(result.current.errors.price).toBeDefined();
    });

    // Now set valid price
    act(() => {
      result.current.setFormField('price', 15000);
    });

    // Error should be cleared immediately by setFormField's error-clearing logic
    expect(result.current.errors.price).toBeUndefined();
  });

  it('should validate price is positive', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', -100);
    });

    await waitFor(() => {
      expect(result.current.errors.price).toBeDefined();
    });

    expect(result.current.errors.price).toContain('Price must be');
  });

  it('should validate stock quantity is non-negative', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('stockQty', -5);
    });

    await waitFor(() => {
      expect(result.current.errors.stockQty).toBeDefined();
    });
  });

  it('should detect when product has changes', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 12000);
    });

    expect(result.current.hasChanges).toBe(true);
  });

  it('should not detect changes when values are same as original', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', mockProduct.price);
    });

    expect(result.current.hasChanges).toBe(false);
  });

  it('should call submitProduct with changes', async () => {
    (apiClient.client.patch as jest.Mock) = jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          ...mockProduct,
          price: 12000,
        },
      },
    });

    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 12000);
    });

    await act(async () => {
      await result.current.submitProduct();
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.submitError).toBeNull();
  });

  it('should handle submit error', async () => {
    const mockError = new Error('Network error');
    (apiClient.client.patch as jest.Mock) = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 12000);
    });

    await act(async () => {
      await result.current.submitProduct();
    });

    expect(result.current.submitError).toBeDefined();
  });

  it('should reset form to initial state', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
    });

    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.resetForm(mockProduct);
    });

    expect(result.current.formData).toEqual({});
    expect(result.current.hasChanges).toBe(false);
  });

  it('should apply multi-field changes', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.setFormField('stockQty', 100);
    });

    expect(result.current.formData.price).toBe(15000);
    expect(result.current.formData.stockQty).toBe(100);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
    });

    let isValid = false;
    act(() => {
      isValid = result.current.validateForm();
    });

    // Should be valid since price is positive
    expect(isValid).toBe(true);
  });

  it('should clear error message', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 0);
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.submitError).toBeNull();
  });
});
