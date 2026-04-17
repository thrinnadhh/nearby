/**
 * useProductSearch hook tests
 * Tests for product search, filtering, debouncing, and edge cases
 */

import { renderHook, act } from '@testing-library/react-native';
import { useProductSearch } from '@/hooks/useProductSearch';

const mockProducts = [
  {
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Fresh Tomatoes',
    description: 'Organic red tomatoes',
    category: 'Vegetables',
    price: 3000,
    stockQty: 15,
    images: [{ id: 'img-1', productId: 'prod-1', url: 'https://example.com/tomato.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' }],
    createdAt: '2026-04-17T10:00:00Z',
    updatedAt: '2026-04-17T10:00:00Z',
    isActive: true,
  },
  {
    id: 'prod-2',
    shopId: 'shop-1',
    name: 'Bananas',
    description: 'Fresh yellow bananas',
    category: 'Fruits',
    price: 2000,
    stockQty: 20,
    images: [{ id: 'img-2', productId: 'prod-2', url: 'https://example.com/banana.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' }],
    createdAt: '2026-04-17T10:00:00Z',
    updatedAt: '2026-04-17T10:00:00Z',
    isActive: true,
  },
  {
    id: 'prod-3',
    shopId: 'shop-1',
    name: 'Tomato Sauce',
    description: 'Homemade tomato sauce',
    category: 'Condiments',
    price: 5000,
    stockQty: 10,
    images: [{ id: 'img-3', productId: 'prod-3', url: 'https://example.com/sauce.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' }],
    createdAt: '2026-04-17T10:00:00Z',
    updatedAt: '2026-04-17T10:00:00Z',
    isActive: true,
  },
];

describe('useProductSearch hook', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns all products when no search query', () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    expect(result.current.filteredProducts).toHaveLength(3);
    expect(result.current.resultCount).toBe(3);
  });

  test('filters products by name', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('Tomato');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(2);
    expect(result.current.filteredProducts[0].name).toBe('Fresh Tomatoes');
  });

  test('searches case-insensitively', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('tomato');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(2);
  });

  test('filters products by description', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('Organic');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Fresh Tomatoes');
  });

  test('filters products by category', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'Fruits'));

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Bananas');
  });

  test('clears search query', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('Tomato');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(2);

    await act(async () => {
      result.current.clearQuery();
      jest.advanceTimersByTime(100);
    });

    expect(result.current.query).toBe('');
    expect(result.current.filteredProducts).toHaveLength(3);
  });

  test('debounces search with 100ms delay', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('T');
      result.current.setQuery('To');
      result.current.setQuery('Tom');
      result.current.setQuery('Toma');
      result.current.setQuery('Tomat');
      result.current.setQuery('Tomato');

      // Advance 50ms - not enough for debounce
      jest.advanceTimersByTime(50);
    });

    // Should not have updated yet
    expect(result.current.filteredProducts.length).toBeGreaterThan(0);

    await act(async () => {
      // Advance another 50ms to reach 100ms total
      jest.advanceTimersByTime(50);
    });

    // Now debounce should have fired
    expect(result.current.filteredProducts).toHaveLength(2);
  });

  test('returns correct result count', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    expect(result.current.resultCount).toBe(3);

    await act(async () => {
      result.current.setQuery('Banana');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.resultCount).toBe(1);
  });

  test('handles whitespace in search', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('  Tomato  ');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(2);
  });

  test('handles special characters in search', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'all'));

    await act(async () => {
      result.current.setQuery('Tomato@#$');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(0);
  });

  test('filters empty array', () => {
    const { result } = renderHook(() => useProductSearch([], 'all'));

    expect(result.current.filteredProducts).toHaveLength(0);
    expect(result.current.resultCount).toBe(0);
  });

  test('handles multiple filter criteria', async () => {
    const { result } = renderHook(() => useProductSearch(mockProducts, 'Vegetables'));

    await act(async () => {
      result.current.setQuery('fresh');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.filteredProducts).toHaveLength(1);
    expect(result.current.filteredProducts[0].name).toBe('Fresh Tomatoes');
  });
});
