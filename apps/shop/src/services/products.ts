/**
 * Products service — fetch and manage products
 */

import axios from 'axios';
import { client } from './api';
import { PRODUCTS_ENDPOINTS } from '@/constants/api';
import { useAuthStore } from '@/store/auth';
import {
  Product,
  ProductsListResponse,
  ProductDetailResponse,
} from '@/types/products';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

/**
 * Extract error message from axios error
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } })
      ?.error?.message;
    return message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

/**
 * GET /shops/:shopId/products — Fetch all products for the authenticated shop
 * Backend filters by JWT shopId from token
 */
export async function getShopProducts(
  page: number = 1,
  limit: number = 50
): Promise<ProductsListResponse> {
  try {
    const shopId = useAuthStore.getState().shopId;
    if (!shopId) {
      throw new AppError(
        'SHOP_ID_MISSING',
        'Shop ID not available in auth store'
      );
    }

    const url = PRODUCTS_ENDPOINTS.LIST_PRODUCTS.replace(':shopId', shopId);
    const { data } = await client.get<ProductsListResponse>(url, {
      params: { page, limit },
    });

    logger.info('Shop products fetched', {
      page,
      limit,
      count: data.data.length,
    });
    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch shop products', { error: message });
    throw new AppError('PRODUCTS_FETCH_FAILED', message);
  }
}

/**
 * GET /products/:id — Fetch single product detail
 */
export async function getProductDetail(productId: string): Promise<Product> {
  try {
    const url = PRODUCTS_ENDPOINTS.GET_PRODUCT.replace(':id', productId);
    const { data } = await client.get<ProductDetailResponse>(url);

    logger.info('Product detail fetched', { productId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch product detail', { productId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }

    throw new AppError('PRODUCT_DETAIL_FETCH_FAILED', message);
  }
}

/**
 * DELETE /products/:id — Soft delete a product
 * Sends DELETE request to mark product as inactive on backend
 * Requires confirmation from UI before calling
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const url = PRODUCTS_ENDPOINTS.DELETE_PRODUCT.replace(':id', productId);
    await client.delete(url);

    logger.info('Product deleted', { productId });
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to delete product', { productId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404);
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new AppError(
        'PRODUCT_NOT_AUTHORIZED',
        'You are not authorized to delete this product',
        403
      );
    }

    throw new AppError('PRODUCT_DELETE_FAILED', message);
  }
}

/**
 * PATCH /products/:id — Update product fields (price, stock_quantity)
 * Partial update - only provided fields are updated
 */
export async function updateProduct(
  productId: string,
  updates: {
    price?: number;
    stock_quantity?: number;
  }
): Promise<Product> {
  try {
    const url = PRODUCTS_ENDPOINTS.UPDATE_PRODUCT.replace(':id', productId);
    const { data } = await client.patch<ProductDetailResponse>(url, updates);

    logger.info('Product updated', { productId, updates });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to update product', { productId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw new AppError('VALIDATION_ERROR', message, 400);
    }
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new AppError(
        'UNAUTHORIZED',
        'Your session expired. Please log in again.',
        401
      );
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new AppError(
        'FORBIDDEN',
        'You are not authorized to update this product',
        403
      );
    }
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError(
        'PRODUCT_NOT_FOUND',
        'Product not found. It may have been deleted.',
        404
      );
    }

    throw new AppError('PRODUCT_UPDATE_FAILED', message);
  }
}

/**
 * PATCH /products/:id — Toggle product availability (is_available boolean)
 * One-tap/swipe toggle for product availability with instant feedback
 * Uses server as single source of truth; client does optimistic update with rollback
 *
 * @param {string} productId - UUID of product
 * @param {boolean} isAvailable - New availability state
 * @returns {Promise<Product>} Updated product with new is_available state
 * @throws {AppError} PRODUCT_NOT_FOUND (404), FORBIDDEN (403), UNAUTHORIZED (401), etc.
 *
 * Edge cases handled:
 * - 404: Product deleted after render → user sees toast "Product no longer available"
 * - 403: Permission revoked → disable toggle, show "No longer have access"
 * - 401: Auth expired → redirect to login (interceptor handles)
 * - Network offline → optimistic UI allows toggle, queues for retry
 */
export async function updateProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<Product> {
  try {
    const url = PRODUCTS_ENDPOINTS.UPDATE_PRODUCT.replace(':id', productId);
    const { data } = await client.patch<ProductDetailResponse>(url, {
      is_available: isAvailable,
    });

    logger.info('Product availability updated', { productId, isAvailable });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to update product availability', {
      productId,
      isAvailable,
      error: message,
    });

    if (axios.isAxiosError(error)) {
      switch (error.response?.status) {
        case 400:
          throw new AppError('VALIDATION_ERROR', message, 400);
        case 401:
          throw new AppError(
            'UNAUTHORIZED',
            'Your session expired. Please log in again.',
            401
          );
        case 403:
          throw new AppError(
            'FORBIDDEN',
            'You no longer have access to this product',
            403
          );
        case 404:
          throw new AppError(
            'PRODUCT_NOT_FOUND',
            'Product no longer exists. It may have been deleted.',
            404
          );
        case 503:
        case 504:
          throw new AppError(
            'SERVICE_UNAVAILABLE',
            'Server temporarily unavailable. Please try again.',
            503
          );
        default:
          break;
      }
    }

    throw new AppError(
      'PRODUCT_AVAILABILITY_UPDATE_FAILED',
      'Failed to update product availability. Please try again.',
      500
    );
  }
}
