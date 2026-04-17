/**
 * Registration service — shop creation, KYC upload, and status checking
 * Handles profile creation, document uploads, and registration submission
 */

import axios, { AxiosError } from 'axios';
import { client } from './api';
import { AppError } from '@/types/common';
import {
  ShopCreationPayload,
  ShopCreationResponse,
  ShopKYC,
  KYCStatusResponse,
  FileUploadResponse,
} from '@/types/shop-registration';
import { Shop } from '@/types/shop';
import logger from '@/utils/logger';

/**
 * POST /shops — Create a new shop profile
 * Called from profile.tsx after form validation
 */
export async function createShop(
  payload: ShopCreationPayload
): Promise<ShopCreationResponse> {
  try {
    const { data } = await client.post<{
      success: boolean;
      data: ShopCreationResponse;
    }>('/shops', payload);

    logger.info('Shop created', {
      shopId: data.data.id,
      name: payload.name,
    });

    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Shop creation failed', {
      error: message,
      payload,
    });

    if (axios.isAxiosError(error) && error.response?.status === 400) {
      throw new AppError('VALIDATION_ERROR', message, 400);
    }

    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new AppError(
        'SHOP_ALREADY_EXISTS',
        'A shop with this phone already exists',
        409
      );
    }

    throw new AppError('SHOP_CREATION_FAILED', message);
  }
}

/**
 * PATCH /shops/:id — Update shop with photo URL after upload
 * Called from photo.tsx after file upload completes
 */
export async function updateShopPhoto(
  shopId: string,
  photoUrl: string
): Promise<Shop> {
  try {
    const { data } = await client.patch<{ success: boolean; data: Shop }>(
      `/shops/${shopId}`,
      { photoUrl }
    );

    logger.info('Shop photo updated', { shopId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Shop photo update failed', { error: message, shopId });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    throw new AppError('PHOTO_UPDATE_FAILED', message);
  }
}

/**
 * POST /shops/:id/kyc — Submit KYC documents
 * Called from kyc.tsx after all 3 documents are uploaded
 */
export async function submitKYCDocuments(
  shopId: string,
  documents: {
    aadhaarUrl: string;
    aadhaarSignedUrl: string;
    gstUrl: string;
    gstSignedUrl: string;
    bankUrl: string;
    bankSignedUrl: string;
  }
): Promise<ShopKYC> {
  try {
    const payload = {
      aadhaarUrl: documents.aadhaarUrl,
      gstUrl: documents.gstUrl,
      bankUrl: documents.bankUrl,
      // Signed URLs for preview (backend stores these for admin display)
      aadhaarSignedUrl: documents.aadhaarSignedUrl,
      gstSignedUrl: documents.gstSignedUrl,
      bankSignedUrl: documents.bankSignedUrl,
    };

    const { data } = await client.post<{ success: boolean; data: ShopKYC }>(
      `/shops/${shopId}/kyc`,
      payload
    );

    logger.info('KYC documents submitted', { shopId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('KYC submission failed', { error: message, shopId });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    if (axios.isAxiosError(error) && error.response?.status === 422) {
      throw new AppError(
        'INVALID_DOCUMENTS',
        'One or more documents are invalid',
        422
      );
    }

    throw new AppError('KYC_SUBMISSION_FAILED', message);
  }
}

/**
 * POST /shops/:id/submit — Submit registration for review
 * Called from review.tsx after confirmation checkbox is checked
 * Backend marks shop as under_review and notifies admin
 */
export async function submitRegistration(shopId: string): Promise<Shop> {
  try {
    const { data } = await client.post<{ success: boolean; data: Shop }>(
      `/shops/${shopId}/submit`,
      {}
    );

    logger.info('Registration submitted for review', { shopId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Registration submission failed', { error: message, shopId });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new AppError(
        'REGISTRATION_ALREADY_SUBMITTED',
        'Registration has already been submitted',
        409
      );
    }

    throw new AppError('SUBMISSION_FAILED', message);
  }
}

/**
 * GET /shops/:id/kyc-status — Poll KYC approval status
 * Called from waiting.tsx in 5-second polling loop
 * Returns status: pending | approved | rejected + reason if rejected
 */
export async function getKYCStatus(shopId: string): Promise<KYCStatusResponse> {
  try {
    const { data } = await client.get<{
      success: boolean;
      data: KYCStatusResponse;
    }>(`/shops/${shopId}/kyc-status`);

    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('KYC status fetch failed', { error: message, shopId });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    throw new AppError('STATUS_FETCH_FAILED', message);
  }
}

/**
 * GET /shops/:id — Fetch full shop profile (used after KYC approval)
 */
export async function getShopProfile(shopId: string): Promise<Shop> {
  try {
    const { data } = await client.get<{ success: boolean; data: Shop }>(
      `/shops/${shopId}`
    );

    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Shop profile fetch failed', { error: message, shopId });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppError('SHOP_NOT_FOUND', 'Shop not found', 404);
    }

    throw new AppError('PROFILE_FETCH_FAILED', message);
  }
}

/**
 * Extract error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      error?: { message?: string };
    };
    return data?.error?.message || error.message || 'Request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
}
