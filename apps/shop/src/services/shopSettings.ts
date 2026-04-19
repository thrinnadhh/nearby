/**
 * Shop settings service
 * API calls for fetching and updating shop settings
 */

import { apiClient } from '@/services/axios';
import {
  ShopSettings,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from '@/types/shopSettings';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

/**
 * Fetch shop settings
 * GET /api/v1/shops/:shopId/settings
 */
export async function fetchShopSettings(shopId: string): Promise<ShopSettings> {
  try {
    logger.info('Fetching shop settings', { shopId });

    const response = await apiClient.get<ShopSettings>(
      `/shops/${shopId}/settings`
    );

    if (!response.data) {
      throw new AppError(
        'FETCH_SETTINGS_FAILED',
        'No settings data received',
        500
      );
    }

    logger.info('Shop settings fetched', { shopId });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch shop settings', {
      shopId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'FETCH_SETTINGS_FAILED',
      'Failed to fetch shop settings',
      500
    );
  }
}

export interface UpdateSettingsParams {
  shopId: string;
  data: UpdateSettingsRequest;
}

/**
 * Update shop settings
 * PATCH /api/v1/shops/:shopId/settings
 */
export async function updateShopSettings(
  params: UpdateSettingsParams
): Promise<UpdateSettingsResponse> {
  const { shopId, data } = params;

  try {
    logger.info('Updating shop settings', { shopId, fields: Object.keys(data) });

    const response = await apiClient.patch<UpdateSettingsResponse>(
      `/shops/${shopId}/settings`,
      data
    );

    if (!response.data) {
      throw new AppError(
        'UPDATE_SETTINGS_FAILED',
        'No response data received',
        500
      );
    }

    logger.info('Shop settings updated successfully', { shopId });
    return response.data;
  } catch (error) {
    logger.error('Failed to update shop settings', {
      shopId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'UPDATE_SETTINGS_FAILED',
      'Failed to update shop settings',
      500
    );
  }
}
