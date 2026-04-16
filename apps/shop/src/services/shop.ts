/**
 * Shop profile service — fetch and update shop information
 */

import axios, { AxiosError } from 'axios';
import { client } from './api';
import { SHOP_ENDPOINTS } from '@/constants/api';
import { Shop, ShopProfile, EarningsData } from '@/types/shop';
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
 * GET /shops/:id — Fetch shop profile for authenticated owner
 * Backend filters to ensure owner can only access their own shop
 */
export async function getShopProfile(shopId: string): Promise<ShopProfile> {
  try {
    const url = SHOP_ENDPOINTS.GET_PROFILE.replace(':id', shopId);
    const { data } = await client.get<{ success: boolean; data: ShopProfile }>(
      url
    );

    logger.info('Shop profile fetched', { shopId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch shop profile', { shopId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new AppError(
        'SHOP_NOT_AUTHORIZED',
        'You are not authorized to access this shop',
        403
      );
    }

    throw new AppError('SHOP_FETCH_FAILED', message);
  }
}

/**
 * PATCH /shops/:id — Update shop profile (toggle is_open status)
 * Typically used to toggle shop open/closed status
 */
export async function toggleShopStatus(
  shopId: string,
  isOpen: boolean
): Promise<{ isOpen: boolean; updatedAt: string }> {
  try {
    const url = SHOP_ENDPOINTS.TOGGLE_OPEN_CLOSE.replace(':id', shopId);
    const { data } = await client.patch<{
      success: boolean;
      data: { isOpen: boolean; updatedAt: string };
    }>(url, { is_open: isOpen });

    logger.info('Shop status toggled', { shopId, isOpen });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to toggle shop status', { shopId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    throw new AppError('SHOP_UPDATE_FAILED', message);
  }
}

/**
 * GET /shops/:id/earnings — Fetch today's and this week's earnings
 * Returns breakdown of orders, amounts, completion status
 */
export async function getEarningsData(shopId: string): Promise<EarningsData> {
  try {
    const url = `/shops/${shopId}/earnings`;
    const { data } = await client.get<{
      success: boolean;
      data: EarningsData;
    }>(url);

    logger.info('Earnings data fetched', { shopId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Failed to fetch earnings data', { shopId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    throw new AppError('EARNINGS_FETCH_FAILED', message);
  }
}
