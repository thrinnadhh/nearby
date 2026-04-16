/**
 * Authentication service — OTP request and verification
 */

import axios, { AxiosError } from 'axios';
import { client } from './api';
import { AUTH_ENDPOINTS } from '@/constants/api';
import {
  OTPRequestPayload,
  OTPRequestResponse,
  OTPVerifyPayload,
  OTPVerifyResponse,
} from '@/types/auth';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';

/**
 * Extract error message from axios error or generic error
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
 * POST /auth/otp-request — Request OTP for phone number
 * Returns requestId which must be used in verify call
 */
export async function requestOTP(
  payload: OTPRequestPayload
): Promise<OTPRequestResponse> {
  try {
    const { data } = await client.post<{
      success: boolean;
      data: OTPRequestResponse;
    }>(AUTH_ENDPOINTS.OTP_REQUEST, payload);

    logger.info('OTP requested successfully', { phone: payload.phone });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('OTP request failed', {
      phone: payload.phone,
      error: message,
    });
    throw new AppError('OTP_REQUEST_FAILED', message);
  }
}

/**
 * POST /auth/otp-verify — Verify OTP and get JWT token
 * Returns JWT, userId, and shopId (shop owner's shop)
 */
export async function verifyOTP(
  payload: OTPVerifyPayload
): Promise<OTPVerifyResponse> {
  try {
    const { data } = await client.post<{
      success: boolean;
      data: OTPVerifyResponse;
    }>(AUTH_ENDPOINTS.OTP_VERIFY, payload);

    logger.info('OTP verified successfully', {
      phone: payload.phone,
      userId: data.data.userId,
    });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('OTP verification failed', {
      phone: payload.phone,
      error: message,
    });

    // Map specific error codes
    if (axios.isAxiosError(error)) {
      const code = (error.response?.data as { error?: { code?: string } })
        ?.error?.code;
      if (code === 'OTP_INVALID') {
        throw new AppError('OTP_INVALID', 'Invalid OTP. Please try again.', 400);
      }
      if (code === 'OTP_EXPIRED') {
        throw new AppError(
          'OTP_EXPIRED',
          'OTP has expired. Please request a new one.',
          400
        );
      }
      if (code === 'OTP_LOCKED') {
        throw new AppError(
          'OTP_LOCKED',
          'Too many failed attempts. Please try again later.',
          429
        );
      }
    }

    throw new AppError('OTP_VERIFY_FAILED', message);
  }
}
