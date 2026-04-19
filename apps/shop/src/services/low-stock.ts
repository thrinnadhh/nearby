/**
 * Low stock alerts service — fetch and manage low stock products
 * Adds new methods to products.ts service
 */

import axios, { AxiosError } from 'axios';
import { client } from './api';
import { useAuthStore } from '@/store/auth';
import {
  LowStockProduct,
  LowStockAlertsResponse,
  LowStockQueryParams,
} from '@/types/low-stock';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

/**
 * Extract error message from axios error
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
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
 * GET /shops/:shopId/products/low-stock
 * Fetch low stock alert products for the authenticated shop
 * Supports filtering by threshold, pagination, and sorting
 */
export async function getLowStockProducts(
  params: LowStockQueryParams = {}
): Promise<LowStockAlertsResponse> {
  try {
    const shopId = useAuthStore.getState().shopId;
    if (!shopId) {
      throw new AppError(
        'SHOP_ID_MISSING',
        'Shop ID not available in auth store'
      );
    }

    const {
      threshold = 5,
      page = 1,
      limit = 20,
      sortBy = 'stock',
    } = params;

    const url = `/api/v1/shops/${shopId}/products/low-stock`;
    const { data } = await client.get<LowStockAlertsResponse>(url, {
      params: {
        threshold: Math.max(1, Math.min(999, threshold)),
        page: Math.max(1, page),
        limit: Math.max(1, Math.min(100, limit)),
        sortBy: ['stock', 'name', 'updated_at'].includes(sortBy)
          ? sortBy
          : 'stock',
      },
    });

    logger.info('Low stock products fetched', {
      threshold: data.meta.threshold,
      page: data.meta.page,
      limit: data.meta.total,
      lowStockCount: data.meta.lowStockCount,
      count: data.data.length,
    });

    return data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch low stock products', { error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AppError(
          'UNAUTHORIZED',
          'Your session expired. Please log in again.',
          401
        );
      }
      if (error.response?.status === 403) {
        throw new AppError(
          'FORBIDDEN',
          'You are not authorized to access low stock alerts',
          403
        );
      }
      if (error.response?.status === 404) {
        throw new AppError(
          'SHOP_NOT_FOUND',
          'Shop not found',
          404
        );
      }
      if (error.response?.status === 400) {
        throw new AppError('VALIDATION_ERROR', message, 400);
      }
    }

    throw new AppError('LOW_STOCK_FETCH_FAILED', message);
  }
}
