/**
 * Settlements service
 * API calls for fetching settlement history
 */

import { apiClient } from '@/services/axios';
import { SettlementListResponse } from '@/types/settlement';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

export interface FetchSettlementsParams {
  shopId: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch settlements for a shop
 * GET /api/v1/shops/:shopId/settlements?page=1&limit=20
 */
export async function fetchSettlements(
  params: FetchSettlementsParams
): Promise<SettlementListResponse> {
  const { shopId, page = 1, limit = 20 } = params;

  try {
    logger.info('Fetching settlements', { shopId, page, limit });

    const response = await apiClient.get<SettlementListResponse>(
      `/shops/${shopId}/settlements`,
      {
        params: { page, limit },
      }
    );

    if (!response.data) {
      throw new AppError(
        'FETCH_SETTLEMENTS_FAILED',
        'No settlements data received',
        500
      );
    }

    logger.info('Settlements fetched successfully', {
      shopId,
      count: response.data.data.length,
      total: response.data.meta.total,
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch settlements', {
      shopId,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error',
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'FETCH_SETTLEMENTS_FAILED',
      'Failed to fetch settlements. Please try again.',
      500
    );
  }
}
