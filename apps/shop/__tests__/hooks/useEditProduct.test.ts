/**
 * Tests for useEditProduct hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEditProduct } from '@/hooks/useEditProduct';
import { useProductsStore } from '@/store/products';
import * as productsService from '@/services/products';
import { Product } from '@/types/products';

jest.mock('@/services/products');
jest.mock('@/store/products');
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
  };

  const mockUpdateProduct = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useProductsStore as jest.Mock).mockReturnValue({
      updateProduct: mockUpdateProduct,
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
  });

  it('should validate entire form', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
    });

    const isValid = result.current.validateForm();
    expect(isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('should reject empty form', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    const isValid = result.current.validateForm();
    expect(isValid).toBe(false);
    expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);
  });

  it('should reject invalid price (zero)', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 0);
    });

    // Wait for deferred validation
    await waitFor(() => {
      expect(result.current.errors.price).toBeDefined();
    });
  });

  it('should reject negative stock', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('stockQty', -1);
    });

    // Wait for deferred validation
    await waitFor(() => {
      expect(result.current.errors.stockQty).toBeDefined();
    });
  });

  it('should validate price field individually', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 0);
    });

    // Wait for deferred validation from useEffect
    await waitFor(() => {
      expect(result.current.errors.price).toBeDefined();
    });
  });

  it('should clear error for valid price field', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.validateField('price');
    });

    expect(result.current.errors.price).toBeUndefined();
  });

  it('should reject submission without changes', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    let response: Product | null = null;

    await act(async () => {
      response = await result.current.submitProduct();
    });

    expect(response).toBeNull();
    expect(result.current.submitError).toBeDefined();
  });

  it('should reject submission with validation errors', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    let response: Product | null = null;

    await act(async () => {
      result.current.setFormField('price', 0); // Invalid
      response = await result.current.submitProduct();
    });

    expect(response).toBeNull();
    expect(result.current.submitError).toBeDefined();
    expect(productsService.updateProduct).not.toHaveBeenCalled();
  });

  it('should handle submission error', async () => {
    (productsService.updateProduct as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    const { result } = renderHook(() => useEditProduct(mockProduct));

    await act(async () => {
      result.current.setFormField('price', 15000);
      await result.current.submitProduct();
    });

    expect(result.current.submitError).toBeDefined();
  });

  it('should clear submit error', async () => {
    (productsService.updateProduct as jest.Mock).mockRejectedValue(
      new Error('Test error')
    );

    const { result } = renderHook(() => useEditProduct(mockProduct));

    await act(async () => {
      result.current.setFormField('price', 15000);
      await result.current.submitProduct();
    });

    expect(result.current.submitError).toBeDefined();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.submitError).toBeNull();
  });

  it('should reset form state', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.setFormField('stockQty', 30);
    });

    expect(result.current.formData.price).toBe(15000);

    act(() => {
      result.current.resetForm(mockProduct);
    });

    expect(result.current.formData).toEqual({});
    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('should detect changes', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    expect(result.current.hasChanges).toBe(false);

    act(() => {
      result.current.setFormField('price', 15000);
    });

    expect(result.current.hasChanges).toBe(true);

    act(() => {
      result.current.setFormField('price', 10000); // Reset
    });

    expect(result.current.hasChanges).toBe(false);
  });

  it('should handle multiple field changes', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.setFormField('stockQty', 30);
    });

    expect(result.current.formData.price).toBe(15000);
    expect(result.current.formData.stockQty).toBe(30);
    expect(result.current.hasChanges).toBe(true);
  });

  it('should validate all fields together', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.setFormField('stockQty', 30);
      result.current.validateForm();
    });

    expect(result.current.errors.price).toBeUndefined();
    expect(result.current.errors.stockQty).toBeUndefined();
  });

  it('should not submit invalid form', async () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    let calls = 0;
    (productsService.updateProduct as jest.Mock).mockImplementation(() => {
      calls++;
      return Promise.resolve(mockProduct);
    });

    await act(async () => {
      result.current.setFormField('price', 0); // Invalid
      await result.current.submitProduct();
    });

    expect(calls).toBe(0); // Should not call API
    expect(result.current.submitError).toBeDefined();
  });

  it('should accept zero stock', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('stockQty', 0);
    });

    const isValid = result.current.validateForm();
    expect(isValid).toBe(true);
    expect(result.current.errors.stockQty).toBeUndefined();
  });

  it('should detect only changed fields', () => {
    const { result } = renderHook(() => useEditProduct(mockProduct));

    act(() => {
      result.current.setFormField('price', 15000);
      result.current.setFormField('stockQty', 50); // Same as original
    });

    // Should still have changes because price changed
    expect(result.current.hasChanges).toBe(true);
  });
});
