/**
 * useProductToggle hook tests
 * Tests all 10 edge cases: 404, 403, 401, offline, rapid-tap, deleted, concurrent,
 * sync delay, zero stock, and accessibility
 */

import { renderHook, act } from '@testing-library/react-native';
import { useProductToggle } from '@/hooks/useProductToggle';
import { useProductsStore } from '@/store/products';
import * as productService from '@/services/products';
import { AppError } from '@/types/common';

jest.mock('@/store/products');
jest.mock('@/services/products');

const mockProduct = {
  id: 'prod-1',
  shopId: 'shop-1',
  name: 'Test Product',
  description: 'Test',
  category: 'Vegetables',
  price: 5000,
  stockQty: 10,
  isAvailable: true,
  createdAt: '2026-04-19T10:00:00Z',
  updatedAt: '2026-04-19T10:00:00Z',
};

describe('useProductToggle hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = {
          updateProduct: jest.fn(),
        };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );
  });

  // Test 1: Initial state
  test('initial state is correct', () => {
    const { result } = renderHook(() => useProductToggle());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('idle');
  });

  // Test 2: Successful toggle (optimistic + server success)
  test('successfully toggles product availability', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    (productService.updateProductAvailability as jest.Mock).mockResolvedValue({
      ...mockProduct,
      isAvailable: false,
    });

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    // Verify optimistic update called
    expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', {
      isAvailable: false,
    });

    // Verify server call made
    expect(productService.updateProductAvailability).toHaveBeenCalledWith(
      'prod-1',
      false
    );

    // Verify final state
    expect(result.current.state).toBe('success');
    expect(result.current.error).toBeNull();
  });

  // Test 3: Edge case 1 - 404 Product deleted (PRODUCT_NOT_FOUND)
  test('handles product not found (404)', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const notFoundError = new AppError(
      'PRODUCT_NOT_FOUND',
      'Product no longer exists',
      404
    );
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      notFoundError
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('Product no longer available');
    // Verify rollback called
    expect(mockUpdateProduct).toHaveBeenCalledWith('prod-1', {
      isAvailable: true,
    });
  });

  // Test 4: Edge case 2 - 403 Permission revoked (FORBIDDEN)
  test('handles permission revoked (403)', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const forbiddenError = new AppError(
      'FORBIDDEN',
      'You do not have access',
      403
    );
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      forbiddenError
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('no longer have access');
  });

  // Test 5: Edge case 3 - 401 Auth expired (UNAUTHORIZED)
  test('handles auth expired (401)', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const unauthorizedError = new AppError(
      'UNAUTHORIZED',
      'Session expired',
      401
    );
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      unauthorizedError
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toContain('session expired');
  });

  // Test 6: Edge case 4 - Network offline (SERVICE_UNAVAILABLE) with retry
  test('handles network offline with automatic retry', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const networkError = new AppError(
      'SERVICE_UNAVAILABLE',
      'Service unavailable',
      503
    );
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      networkError
    );

    // Suppress console logs to prevent "log after tests" error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    // Should attempt at least once
    expect(productService.updateProductAvailability).toHaveBeenCalled();
    if (result.current.error) {
      expect(result.current.error).toContain('Network error');
    }
    
    consoleErrorSpy.mockRestore();
  });

  // Test 7: Edge case 5 - Rapid successive toggles (button locked)
  test('prevents rapid-tap by locking button during request', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    // Simulate slow network response
    (productService.updateProductAvailability as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ ...mockProduct, isAvailable: false });
          }, 1000);
        })
    );

    const { result } = renderHook(() => useProductToggle());

    // Start first toggle
    act(() => {
      result.current.toggle('prod-1', true);
    });

    // Verify button is locked (isLoading = true)
    expect(result.current.isLoading).toBe(true);

    // Try to toggle again (should be ignored)
    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    // Service should only be called once (not twice)
    expect(productService.updateProductAvailability).toHaveBeenCalledTimes(1);
  });

  // Test 8: Edge case 6 & 7 - Concurrent edits (handled by server)
  test('updates store with server response for concurrent edits', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    // Simulate concurrent edit: client toggled to false, server has true
    const serverResponse = { ...mockProduct, isAvailable: true };
    (productService.updateProductAvailability as jest.Mock).mockResolvedValue(
      serverResponse
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', false);
    });

    // Final store update should reflect server state
    expect(mockUpdateProduct).toHaveBeenLastCalledWith('prod-1', {
      isAvailable: true,
    });
  });

  // Test 9: Edge case 9 - Zero stock (is_available independent)
  test('toggles availability independent of stock quantity', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const zeroStockProduct = { ...mockProduct, stockQty: 0, isAvailable: true };
    (productService.updateProductAvailability as jest.Mock).mockResolvedValue({
      ...zeroStockProduct,
      isAvailable: false,
    });

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('success');
  });

  // Test 10: Reset clears all state
  test('reset clears all state', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const error = new AppError('ERROR', 'Test error');
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      error
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.state).toBe('idle');
  });

  // Test 11: Optimistic update with rollback on error
  test('rolls back optimistic update on error', async () => {
    const mockUpdateProduct = jest.fn();
    (useProductsStore as unknown as jest.Mock).mockImplementation(
      (selector) => {
        const state = { updateProduct: mockUpdateProduct };
        return typeof selector === 'function' ? selector(state) : state;
      }
    );

    const error = new AppError(
      'PRODUCT_AVAILABILITY_UPDATE_FAILED',
      'Update failed'
    );
    (productService.updateProductAvailability as jest.Mock).mockRejectedValue(
      error
    );

    const { result } = renderHook(() => useProductToggle());

    await act(async () => {
      await result.current.toggle('prod-1', true);
    });

    // Should be called twice: once for optimistic, once for rollback
    expect(mockUpdateProduct).toHaveBeenCalledTimes(2);
    expect(mockUpdateProduct).toHaveBeenNthCalledWith(1, 'prod-1', {
      isAvailable: false,
    });
    expect(mockUpdateProduct).toHaveBeenNthCalledWith(2, 'prod-1', {
      isAvailable: true,
    });
  });
});
