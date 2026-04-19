/**
 * Authentication service — OTP request/verify and partner registration
 */

import axios from 'axios';
import { client } from './api';
import { AUTH_ENDPOINTS } from '@/constants/api';
import {
  OTPRequestPayload,
  OTPRequestResponse,
  OTPVerifyPayload,
  OTPVerifyResponse,
  PartnerRegisterPayload,
  PartnerRegisterResponse,
} from '@/types/auth';
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
 * POST /auth/send-otp
 */
export async function requestOTP(
  payload: OTPRequestPayload
): Promise<OTPRequestResponse> {
  try {
    const { data } = await client.post<{
      success: boolean;
      data: OTPRequestResponse;
    }>(AUTH_ENDPOINTS.OTP_REQUEST, payload);

    logger.info('OTP requested successfully', { phone: payload.phone.slice(-4) });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('OTP request failed', {
      phone: (payload.phone || '').slice(-4),
      error: message,
    });
    throw new AppErrorClass('OTP_REQUEST_FAILED', message);
  }
}

/**
 * POST /auth/verify-otp
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
      phone: payload.phone.slice(-4),
      userId: data.data.userId,
    });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('OTP verification failed', {
      phone: (payload.phone || '').slice(-4),
      error: message,
    });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new AppErrorClass('OTP_LOCKED', 'Too many failed attempts. Try again later.', 429);
      }
      if (error.response?.status === 400) {
        throw new AppErrorClass('INVALID_OTP', message || 'Invalid OTP', 400);
      }
    }

    throw new AppErrorClass('OTP_VERIFY_FAILED', message);
  }
}

/**
 * POST /auth/partner/register
 */
export async function registerPartner(
  payload: PartnerRegisterPayload
): Promise<PartnerRegisterResponse> {
  try {
    const { data } = await client.post<{
      success: boolean;
      data: PartnerRegisterResponse;
    }>(AUTH_ENDPOINTS.PARTNER_REGISTER, payload);

    logger.info('Partner registration successful', {
      userId: data.data.userId,
      phone: payload.phone.slice(-4),
    });
    return data.data;
  } catch (error) {
    const message = extractErrorMessage(error);
    logger.error('Partner registration failed', {
      phone: (payload.phone || '').slice(-4),
      error: message,
    });

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new AppErrorClass('OTP_LOCKED', message || 'Too many attempts. Try again later.', 429);
      }
      if (error.response?.status === 409) {
        throw new AppErrorClass('DUPLICATE_PHONE', 'Phone already registered', 409);
      }
    }

    throw new AppErrorClass('REGISTRATION_FAILED', message);
  }
}
