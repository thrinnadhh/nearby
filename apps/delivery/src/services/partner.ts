/**
 * Delivery partner service — KYC submission and profile updates
 */

import axios from 'axios';
import { client } from './api';
import { PARTNER_ENDPOINTS } from '@/constants/api';
import { KYCDocument, BankDetails } from '@/types/registration';
import { OnlineStatusResponse } from '@/types/delivery-partner';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

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
 * POST /delivery-partners/:id/kyc
 */
export async function submitKYC(
  partnerId: string,
  kyc: KYCDocument
): Promise<any> {
  try {
    const { data } = await client.post<{ success: boolean; data: any }>(
      PARTNER_ENDPOINTS.KYC_SUBMIT.replace(':id', partnerId),
      {
        aadhaarLast4: kyc.aadhaarLast4,
        aadhaarImageUrl: kyc.aadhaarImageUrl,
        vehiclePhotoUrl: kyc.vehiclePhotoUrl,
      }
    );

    logger.info('KYC submitted successfully', { partnerId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('KYC submission failed', { partnerId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppErrorClass('PARTNER_NOT_FOUND', 'Partner profile not found', 404);
    }

    throw new AppErrorClass('KYC_SUBMIT_FAILED', message);
  }
}

/**
 * PATCH /delivery-partners/:id
 */
export async function updateBankDetails(
  partnerId: string,
  bankDetails: BankDetails
): Promise<any> {
  try {
    const { data } = await client.patch<{ success: boolean; data: any }>(
      PARTNER_ENDPOINTS.UPDATE_PROFILE.replace(':id', partnerId),
      {
        bankAccountNumber: bankDetails.bankAccountNumber,
        bankIFSC: bankDetails.bankIFSC,
        bankAccountName: bankDetails.bankAccountName,
      }
    );

    logger.info('Bank details updated successfully', { partnerId });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Bank details update failed', { partnerId, error: message });

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new AppErrorClass('PARTNER_NOT_FOUND', 'Partner profile not found', 404);
    }

    throw new AppErrorClass('PROFILE_UPDATE_FAILED', message);
  }
}

/**
 * PATCH /delivery-partners/:id/toggle-online
 */
export async function toggleOnlineStatus(
  partnerId: string,
  isOnline: boolean
): Promise<OnlineStatusResponse> {
  try {
    const { data } = await client.patch<{ success: boolean; data: OnlineStatusResponse }>(
      PARTNER_ENDPOINTS.TOGGLE_ONLINE.replace(':id', partnerId),
      { isOnline }
    );

    logger.info('Online status toggled', { partnerId, isOnline });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Toggle online status failed', { partnerId, error: message });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new AppErrorClass('PARTNER_NOT_FOUND', 'Partner profile not found', 404);
      }
      if (error.response?.status === 429) {
        throw new AppErrorClass('RATE_LIMITED', message || 'Too many requests', 429);
      }
      if (error.response?.status === 400 && message.includes('KYC')) {
        throw new AppErrorClass('KYC_NOT_APPROVED', 'Complete KYC before going online', 400);
      }
    }

    throw new AppErrorClass('TOGGLE_FAILED', message);
  }
}

/**
 * POST /api/v1/auth/partner/register
 * Register new delivery partner with phone + OTP
 */
export async function registerPartner(
  phone: string,
  otp: string
): Promise<{ userId: string; phone: string; token: string; role: 'delivery' }> {
  try {
    const response = await client.post<{ success: boolean; data: { userId: string; phone: string; token: string; role: 'delivery' } }>(
      '/auth/partner/register',
      {
        phone: phone.replace(/\D/g, ''), // Remove non-digits
        otp: otp.replace(/\D/g, ''),   // Remove non-digits
      }
    );

    if (!response.data.success) {
      const errorMsg = (response.data as any)?.error?.message || 'Registration failed';
      throw new AppErrorClass(
        'REGISTRATION_FAILED',
        errorMsg,
        400
      );
    }

    logger.info('Partner registered successfully', { phone: phone.slice(-4) });
    return response.data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Partner registration failed', { phone: phone.slice(-4), error: message });

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorCode = (error.response?.data as any)?.error?.code;

      if (status === 409 || errorCode === 'DUPLICATE_SHOP') {
        throw new AppErrorClass(
          'DUPLICATE_PARTNER',
          'This phone number is already registered as a delivery partner',
          409
        );
      }

      if (status === 429 || errorCode === 'OTP_LOCKED') {
        throw new AppErrorClass(
          'OTP_LOCKED',
          'Too many failed attempts. Please try again later.',
          429
        );
      }

      if (status === 400) {
        if (errorCode === 'INVALID_OTP') {
          throw new AppErrorClass('INVALID_OTP', 'Invalid OTP. Please try again.', 400);
        }
        if (errorCode === 'OTP_EXPIRED') {
          throw new AppErrorClass('OTP_EXPIRED', 'OTP has expired. Request a new one.', 400);
        }
        throw new AppErrorClass('VALIDATION_ERROR', message, 400);
      }
    }

    throw new AppErrorClass('REGISTRATION_FAILED', message, 500);
  }
}
