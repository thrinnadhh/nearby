/**
 * Zustand products store — shop's product catalogue
 * Synced via API and Socket.IO events from backend
 * SECURITY FIX #1: Search query input validation (100 char limit, whitespace trimming)
 */

import { create } from 'zustand';
import { Product, ProductQueryFilters } from '@/types/products';
import logger from '@/utils/logger';

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  activeCategory: string; // 'all' or specific category
}

interface ProductsActions {
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: string) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  reset: () => void;
}

interface ProductsSelectors {
  filteredProducts: () => Product[]; // search + category filter combined
  lowStockProducts: () => Product[]; // stockQty <= 5
  getUniqueCategories: () => string[]; // ['All', 'Vegetables', 'Fruits', ...]
}

const initialState: ProductsState = {
  products: [],
  loading: false,
  error: null,
  searchQuery: '',
  activeCategory: 'all',
};

// SECURITY FIX #1: Validate and sanitize search input
function validateSearchQuery(query: string): string {
  // Trim whitespace and limit to 100 characters
  return query.trim().substring(0, 100);
}

export const useProductsStore = create<
  ProductsState & ProductsActions & ProductsSelectors
>((set, get) => ({
  ...initialState,

  setProducts: (products) => {
    logger.info('Products list updated', { count: products.length });
    set({ products });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    if (error) {
      logger.error('Products store error', { error });
    }
    set({ error });
  },

  setSearchQuery: (query) => {
    // SECURITY FIX #1: Validate and sanitize input
    const validatedQuery = validateSearchQuery(query);
    logger.info('Products search query updated', { query: validatedQuery, originalLength: query.length });
    set({ searchQuery: validatedQuery });
  },

  setActiveCategory: (category) => {
    logger.info('Products active category changed', { category });
    set({ activeCategory: category });
  },

  updateProduct: (productId, updates) => {
    logger.info('Product updated in store', { productId, updates });
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...updates } : p
      ),
    }));
  },

  deleteProduct: (productId) => {
    logger.info('Product deleted from store', { productId });
    set((state) => ({
      products: state.products.filter((p) => p.id !== productId),
    }));
  },

  reset: () => {
    logger.info('Products store reset');
    set(initialState);
  },

  // Selectors
  filteredProducts: () => {
    const state = get();
    let filtered = state.products;

    // Apply search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (state.activeCategory !== 'all') {
      filtered = filtered.filter((p) => p.category === state.activeCategory);
    }

    return filtered;
  },

  lowStockProducts: () => {
    const state = get();
    return state.products.filter((p) => p.stockQty <= 5 && p.stockQty > 0);
  },

  getUniqueCategories: () => {
    const state = get();
    const categories = new Set(state.products.map((p) => p.category));
    return Array.from(categories).sort();
  },
}));
