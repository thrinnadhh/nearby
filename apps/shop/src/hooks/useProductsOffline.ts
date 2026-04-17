/**
 * useProductsOffline hook — offline support with AsyncStorage caching
 * Caches products locally and provides fallback when network is unavailable
 */

import { useEffect, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStatus } from './useNetworkStatus';
import { Product } from '@/types/products';
import logger from '@/utils/logger';

const PRODUCTS_CACHE_KEY = '@nearby_shop_products_cache';
const PRODUCTS_CACHE_TIMESTAMP_KEY = '@nearby_shop_products_cache_timestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheMetadata {
  timestamp: number;
  count: number;
  shopId: string;
}

/**
 * useProductsOffline hook
 * Provides caching and offline support for products
 */
export function useProductsOffline() {
  const { isOnline } = useNetworkStatus();
  const [cachedProducts, setCachedProducts] = useState<Product[] | null>(null);
  const [cacheValid, setCacheValid] = useState(false);

  /**
   * Load products from cache
   */
  const loadFromCache = useCallback(async (shopId: string) => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(PRODUCTS_CACHE_TIMESTAMP_KEY);

      if (!cached || !timestamp) {
        logger.info('No products cache found');
        return null;
      }

      const cacheAge = Date.now() - parseInt(timestamp, 10);
      const isExpired = cacheAge > CACHE_DURATION_MS;

      if (isExpired) {
        logger.info('Products cache expired', { ageMs: cacheAge });
        await clearCache();
        return null;
      }

      const products = JSON.parse(cached) as Product[];
      logger.info('Products loaded from cache', {
        count: products.length,
        ageMs: cacheAge,
      });

      setCachedProducts(products);
      setCacheValid(true);
      return products;
    } catch (err) {
      logger.error('Failed to load products from cache', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  /**
   * Save products to cache
   */
  const saveToCache = useCallback(async (products: Product[], shopId: string) => {
    try {
      await AsyncStorage.multiSet([
        [PRODUCTS_CACHE_KEY, JSON.stringify(products)],
        [PRODUCTS_CACHE_TIMESTAMP_KEY, Date.now().toString()],
      ]);

      logger.info('Products cached', { count: products.length });
      setCachedProducts(products);
      setCacheValid(true);
    } catch (err) {
      logger.error('Failed to cache products', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  /**
   * Clear products cache
   */
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([PRODUCTS_CACHE_KEY, PRODUCTS_CACHE_TIMESTAMP_KEY]);
      setCachedProducts(null);
      setCacheValid(false);
      logger.info('Products cache cleared');
    } catch (err) {
      logger.error('Failed to clear products cache', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  /**
   * Get cache metadata
   */
  const getCacheMetadata = useCallback(async (shopId: string): Promise<CacheMetadata | null> => {
    try {
      const cached = await AsyncStorage.getItem(PRODUCTS_CACHE_KEY);
      const timestamp = await AsyncStorage.getItem(PRODUCTS_CACHE_TIMESTAMP_KEY);

      if (!cached || !timestamp) {
        return null;
      }

      const products = JSON.parse(cached) as Product[];
      return {
        timestamp: parseInt(timestamp, 10),
        count: products.length,
        shopId,
      };
    } catch (err) {
      logger.error('Failed to get cache metadata', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  return {
    // State
    cachedProducts,
    isOnline,
    cacheValid,

    // Methods
    loadFromCache,
    saveToCache,
    clearCache,
    getCacheMetadata,

    // Computed
    shouldUseCachedData: !isOnline && cacheValid,
  };
}
