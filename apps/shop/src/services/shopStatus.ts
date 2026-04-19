/**
 * Shop status service
 * API calls for updating shop status and holiday mode
 */

import { apiClient } from '@/services/axios';
import { UpdateStatusRequest, UpdateStatusResponse } from '@/types/shopStatus';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

export interface UpdateStatusParams {
  shopId: string;
  data: UpdateStatusRequest;
}

/**
 * Update shop open/close status
 * PATCH /api/v1/shops/:shopId/toggle
 */
export async function updateShopStatus(
  params: UpdateStatusParams
): Promise<UpdateStatusResponse> {
  const { shopId, data } = params;

  try {
    logger.info('Updating shop status', { shopId, data });

    const response = await apiClient.patch<UpdateStatusResponse>(
      `/shops/${shopId}/toggle`,
      data
    );

    if (!response.data) {
      throw new AppError(
        'UPDATE_STATUS_FAILED',
        'No response data received',
        500
      );
    }

    logger.info('Shop status updated successfully', { shopId });
    return response.data;
  } catch (error) {
    logger.error('Failed to update shop status', {
      shopId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'UPDATE_STATUS_FAILED',
      'Failed to update shop status. Please try again.',
      500
    );
  }
}

/**
 * Set holiday mode
 * PATCH /api/v1/shops/:shopId/holiday-mode
 */
export async function setHolidayMode(params: UpdateStatusParams): Promise<UpdateStatusResponse> {
  const { shopId, data } = params;

  try {
    logger.info('Setting holiday mode', { shopId, data });

    const response = await apiClient.patch<UpdateStatusResponse>(
      `/shops/${shopId}/holiday-mode`,
      data
    );

    if (!response.data) {
      throw new AppError(
        'HOLIDAY_MODE_FAILED',
        'No response data received',
        500
      );
    }

    logger.info('Holiday mode set successfully', { shopId });
    return response.data;
  } catch (error) {
    logger.error('Failed to set holiday mode', {
      shopId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'HOLIDAY_MODE_FAILED',
      'Failed to set holiday mode. Please try again.',
      500
    );
  }
}
