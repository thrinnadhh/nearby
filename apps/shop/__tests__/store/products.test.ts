/**
 * useProductsStore Tests
 * Zustand store logic validation (direct store API, no React dependencies)
 */

import { useProductsStore } from '@/store/products';
import { Product } from '@/types/products';

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    shopId: 'shop-1',
    name: 'Fresh Tomatoes',
    description: 'Red, juicy tomatoes',
    category: 'Vegetables',
    price: 5000,
    stockQty: 50,
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'prod-2',
    shopId: 'shop-1',
    name: 'Carrots',
    description: 'Orange carrots',
    category: 'Vegetables',
    price: 3000,
    stockQty: 3,
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isActive: true,
  },
  {
    id: 'prod-3',
    shopId: 'shop-1',
    name: 'Bananas',
    description: 'Yellow bananas',
    category: 'Fruits',
    price: 4000,
    stockQty: 25,
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isActive: true,
  },
];

describe('useProductsStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useProductsStore.setState({
      products: [],
      loading: false,
      error: null,
      searchQuery: '',
      activeCategory: 'all',
    });
  });

  describe('State Management', () => {
    it('initializes with empty state', () => {
      const state = useProductsStore.getState();
      expect(state.products).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.searchQuery).toBe('');
      expect(state.activeCategory).toBe('all');
    });

    it('sets products', () => {
      const { setProducts } = useProductsStore.getState();
      setProducts(mockProducts);

      const state = useProductsStore.getState();
      expect(state.products).toHaveLength(3);
      expect(state.products[0].name).toBe('Fresh Tomatoes');
    });

    it('sets loading state', () => {
      const { setLoading } = useProductsStore.getState();
      setLoading(true);

      let state = useProductsStore.getState();
      expect(state.loading).toBe(true);

      setLoading(false);
      state = useProductsStore.getState();
      expect(state.loading).toBe(false);
    });

    it('sets error state', () => {
      const { setError } = useProductsStore.getState();
      const errorMsg = 'Failed to fetch';
      setError(errorMsg);

      let state = useProductsStore.getState();
      expect(state.error).toBe(errorMsg);

      setError(null);
      state = useProductsStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Filter Actions', () => {
    it('updates search query', () => {
      const { setSearchQuery } = useProductsStore.getState();
      setSearchQuery('tomato');

      const state = useProductsStore.getState();
      expect(state.searchQuery).toBe('tomato');
    });

    it('updates active category', () => {
      const { setActiveCategory } = useProductsStore.getState();
      setActiveCategory('Vegetables');

      const state = useProductsStore.getState();
      expect(state.activeCategory).toBe('Vegetables');
    });
  });

  describe('Product Actions', () => {
    it('updates existing product', () => {
      useProductsStore.setState({ products: [...mockProducts] });

      const { updateProduct } = useProductsStore.getState();
      updateProduct('prod-1', { stockQty: 40 });

      const state = useProductsStore.getState();
      const updatedProduct = state.products.find((p) => p.id === 'prod-1');
      expect(updatedProduct?.stockQty).toBe(40);
    });

    it('deletes product', () => {
      useProductsStore.setState({ products: [...mockProducts] });

      let state = useProductsStore.getState();
      expect(state.products).toHaveLength(3);

      const { deleteProduct } = useProductsStore.getState();
      deleteProduct('prod-1');

      state = useProductsStore.getState();
      expect(state.products).toHaveLength(2);
      expect(state.products.find((p) => p.id === 'prod-1')).toBeUndefined();
    });

    it('resets state', () => {
      useProductsStore.setState({
        products: [...mockProducts],
        searchQuery: 'test',
        activeCategory: 'Vegetables',
        loading: true,
        error: 'test error',
      });

      const { reset } = useProductsStore.getState();
      reset();

      const state = useProductsStore.getState();
      expect(state.products).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.activeCategory).toBe('all');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      useProductsStore.setState({ products: [...mockProducts] });
    });

    it('filters products by search query', () => {
      const { setSearchQuery, filteredProducts } = useProductsStore.getState();
      setSearchQuery('tomato');

      const filtered = filteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('prod-1');
    });

    it('filters products by category', () => {
      const { setActiveCategory, filteredProducts } = useProductsStore.getState();
      setActiveCategory('Fruits');

      const filtered = filteredProducts();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Bananas');
    });

    it('identifies low stock products', () => {
      const { lowStockProducts } = useProductsStore.getState();
      const lowStock = lowStockProducts();

      expect(lowStock).toHaveLength(1);
      expect(lowStock[0].id).toBe('prod-2');
      expect(lowStock[0].stockQty).toBe(3);
    });

    it('extracts unique categories', () => {
      const { getUniqueCategories } = useProductsStore.getState();
      const categories = getUniqueCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('Vegetables');
      expect(categories).toContain('Fruits');
    });
  });
});
