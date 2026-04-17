/**
 * useProducts hook — fetch and manage products
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useProductsStore } from '@/store/products';
import {
  getShopProducts,
  getProductDetail,
  deleteProduct as deleteProductAPI,
} from '@/services/products';
import { Product, ProductsListResponse } from '@/types/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

interface UseProductsActions {
  fetchProducts: (page?: number) => Promise<void>;
  fetchProductDetail: (productId: string) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  retry: () => Promise<void>;
}

export function useProducts(): UseProductsActions & {
  products: Product[];
  loading: boolean;
  error: string | null;
} {
  const shopId = useAuthStore((s) => s.shopId);
  const {
    products,
    loading,
    error,
    setProducts,
    setLoading,
    setError,
    deleteProduct: deleteProductFromStore,
  } = useProductsStore();

  const [actionLoading, setActionLoading] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    if (shopId && products.length === 0 && !loading) {
      fetchProducts();
    }
  }, [shopId]);

  const fetchProducts = useCallback(
    async (page: number = 1) => {
      if (!shopId) {
        logger.warn('shopId not available for products fetch');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response: ProductsListResponse = await getShopProducts(page, 50);
        setProducts(response.data);
        logger.info('Products fetched', {
          count: response.data.length,
          total: response.meta.total,
        });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to fetch products';
        setError(message);
        logger.error('Failed to fetch products', { error: message });
      } finally {
        setLoading(false);
      }
    },
    [shopId, setProducts, setLoading, setError]
  );

  const fetchProductDetail = useCallback(
    async (productId: string): Promise<Product> => {
      try {
        const product = await getProductDetail(productId);
        logger.info('Product detail fetched', { productId });
        return product;
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to fetch product';
        logger.error('Failed to fetch product detail', {
          productId,
          error: message,
        });
        throw err;
      }
    },
    []
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      setActionLoading(true);
      setError(null);

      try {
        await deleteProductAPI(productId);
        deleteProductFromStore(productId);
        logger.info('Product deleted successfully', { productId });
      } catch (err) {
        const message =
          err instanceof AppError ? err.message : 'Failed to delete product';
        setError(message);
        logger.error('Failed to delete product', { productId, error: message });
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [deleteProductFromStore, setError]
  );

  const retry = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    fetchProductDetail,
    deleteProduct,
    retry,
  };
}
