/**
 * Earnings API service
 * Fetches earnings and analytics data from backend
 */

import axios from 'axios';
import { client } from './api';
import { ApiResponse } from '@/types/common';
import { EarningsData, DateRange } from '@/types/earnings';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

/**
 * Fetch earnings analytics for a shop
 * @param shopId - Shop ID
 * @param dateRange - Date range (7d | 30d | 90d)
 * @returns EarningsData with today/week/month breakdown
 */
export async function getAnalytics(
  shopId: string,
  dateRange: DateRange = '30d'
): Promise<EarningsData> {
  try {
    const response = await client.get<ApiResponse<EarningsData>>(
      `/shops/${shopId}/analytics`,
      {
        params: { dateRange },
      }
    );

    if (!response.data.success) {
      throw new AppError(
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.data.error?.message || 'Failed to fetch analytics'
      );
    }

    logger.info('Analytics fetched', {
      shopId,
      dateRange,
      hasData: !!response.data.data,
    });

    return response.data.data as EarningsData;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch analytics';
    logger.error('Analytics fetch error', {
      shopId,
      dateRange,
      error: message,
    });

    const statusCode = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;

    throw new AppError(
      'ANALYTICS_FETCH_ERROR',
      message,
      statusCode
    );
  }
}
