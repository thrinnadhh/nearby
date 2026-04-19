/**
 * Analytics API service for Task 12.10
 */

import { client } from './api';
import { ApiResponse } from '@/types/common';
import { TopProduct, AnalyticsDateRange } from '@/types/analytics';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

/**
 * Fetch top products for a shop
 */
export async function getTopProducts(
  shopId: string,
  limit: number = 5,
  dateRange: AnalyticsDateRange = '30d'
): Promise<TopProduct[]> {
  try {
    const response = await client.get<ApiResponse<TopProduct[]>>(
      `/shops/${shopId}/analytics/top-products`,
      {
        params: { limit, dateRange },
      }
    );

    if (!response.data.success) {
      throw new AppError(
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.data.error?.message || 'Failed to fetch top products'
      );
    }

    logger.info('Top products fetched', {
      shopId,
      limit,
      dateRange,
      count: response.data.data?.length || 0,
    });

    return response.data.data as TopProduct[];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch top products';
    logger.error('Top products fetch error', {
      shopId,
      dateRange,
      error: message,
    });

    throw new AppError(
      'TOP_PRODUCTS_FETCH_ERROR',
      message,
      (error as any)?.response?.status
    );
  }
}
