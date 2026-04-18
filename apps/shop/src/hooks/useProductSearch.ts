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
  // Use ReturnType<typeof setTimeout> for cross-environment compatibility
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Debounced search handler
   * Delays actual search to reduce re-renders while user is typing
   */
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setQueryState(searchQuery);
      logger.debug('Search query applied', { query: searchQuery });
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  /**
   * Set search query with debounce
   */
  const setQuery = useCallback(
    (newQuery: string) => {
      debouncedSearch(newQuery);
    },
    [debouncedSearch]
  );

  /**
   * Clear search query immediately
   */
  const clearQuery = useCallback(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setQueryState('');
    logger.info('Search query cleared');
  }, []);

  /**
   * Filter products based on search query and category
   * Searches across: name, description, category
   * Case-insensitive, trims whitespace before matching
   */
  const filteredProducts = useMemo(() => {
    let results = products;

    // Apply category filter
    if (category !== 'all') {
      results = results.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply search query (only if non-whitespace chars present)
    const trimmed = query.trim();
    if (trimmed) {
      const searchLower = trimmed.toLowerCase();
      results = results.filter((product) => {
        const nameMatch = product.name.toLowerCase().includes(searchLower);
        const descriptionMatch = product.description
          .toLowerCase()
          .includes(searchLower);
        const categoryMatch = product.category
          .toLowerCase()
          .includes(searchLower);

        return nameMatch || descriptionMatch || categoryMatch;
      });
    }

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
