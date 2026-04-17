/**
 * useProductSearch hook — client-side search and filtering logic
 * Handles search query debouncing, category filtering, and result ranking
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { Product } from '@/types/products';
import logger from '@/utils/logger';

interface UseProductSearchReturn {
  query: string;
  filteredProducts: Product[];
  resultCount: number;
  setQuery: (query: string) => void;
  clearQuery: () => void;
  debouncedSearch: (query: string) => void;
}

const SEARCH_DEBOUNCE_MS = 100; // 100ms max latency per spec

/**
 * useProductSearch hook
 * @param products - array of products to search
 * @param category - active category filter ('all' or specific category)
 * @returns search state and methods
 */
export function useProductSearch(
  products: Product[],
  category: string = 'all'
): UseProductSearchReturn {
  const [query, setQueryState] = useState('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Debounced search handler
   * Delays actual search to reduce re-renders while user is typing
   */
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setQueryState(searchQuery);
      logger.debug('Search query applied', { query: searchQuery });
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  /**
   * Set search query immediately (for controlled input)
   */
  const setQuery = useCallback((newQuery: string) => {
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  /**
   * Clear search query
   */
  const clearQuery = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setQueryState('');
    logger.info('Search query cleared');
  }, []);

  /**
   * Filter products based on search query and category
   * Searches across: name, description, category
   * Case-insensitive matching
   */
  const filteredProducts = useMemo(() => {
    let results = products;

    // Apply category filter
    if (category !== 'all') {
      results = results.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    // Apply search query
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim();
      results = results.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchLower);
        const descriptionMatch = product.description
          .toLowerCase()
          .includes(searchLower);
        const categoryMatch = product.category.toLowerCase().includes(searchLower);

        return nameMatch || descriptionMatch || categoryMatch;
      });
    }

    logger.debug('Products filtered', {
      query,
      category,
      resultCount: results.length,
      totalProducts: products.length,
    });

    return results;
  }, [products, query, category]);

  return {
    query,
    filteredProducts,
    resultCount: filteredProducts.length,
    setQuery,
    clearQuery,
    debouncedSearch,
  };
}
