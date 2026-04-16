/**
 * useAuth hook — OTP request, verification, and login flow
 */

import { useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';
import { requestOTP, verifyOTP } from '@/services/auth';
import { OTPRequestResponse, OTPVerifyResponse } from '@/types/auth';
import { AppError } from '@/types/common';
import logger from '@/utils/logger';
import { validatePhone, validateOTP } from '@/utils/validators';

interface UseAuthState {
  phone: string;
  otp: string;
  requestId: string | null;
  loading: boolean;
  attemptsRemaining: number;
  error: string | null;
}

interface UseAuthActions {
  setPhone: (phone: string) => void;
  setOtp: (otp: string) => void;
  requestOtpCode: () => Promise<OTPRequestResponse>;
  verifyOtpCode: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const OTP_MAX_ATTEMPTS = 3;

export function useAuth(): UseAuthState & UseAuthActions {
  const [state, setState] = useState<UseAuthState>({
    phone: '',
    otp: '',
    requestId: null,
    loading: false,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    error: null,
  });

  const { login, logout: logoutStore } = useAuthStore();

  const setPhone = useCallback((phone: string) => {
    setState((prev) => ({ ...prev, phone }));
  }, []);

  const setOtp = useCallback((otp: string) => {
    setState((prev) => ({ ...prev, otp }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const requestOtpCode = useCallback(async (): Promise<OTPRequestResponse> => {
    setState((prev) => ({ ...prev, error: null, loading: true }));

    try {
      // Validate phone
      const validation = validatePhone(state.phone);
      if (!validation.valid) {
        throw new AppError(
          'INVALID_PHONE',
          validation.error || 'Invalid phone number'
        );
      }

      // Request OTP
      const response = await requestOTP({ phone: state.phone });

      setState((prev) => ({
        ...prev,
        requestId: response.requestId,
        attemptsRemaining: OTP_MAX_ATTEMPTS,
        loading: false,
      }));

      logger.info('OTP requested successfully');
      return response;
    } catch (error) {
      const message =
        error instanceof AppError ? error.message : 'Failed to request OTP';
      setState((prev) => ({
        ...prev,
        error: message,
        loading: false,
      }));
      logger.error('OTP request failed', { error: message });
      throw error;
    }
  }, [state.phone]);

  const verifyOtpCode = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, error: null, loading: true }));

    try {
      // Validate OTP
      const validation = validateOTP(state.otp);
      if (!validation.valid) {
        throw new AppError('OTP_INVALID', validation.error || 'Invalid OTP');
      }

      if (!state.requestId) {
        throw new AppError(
          'OTP_REQUEST_MISSING',
          'OTP request ID not found. Please request OTP again.'
        );
      }

      // Verify OTP
      const response: OTPVerifyResponse = await verifyOTP({
        phone: state.phone,
        otp: state.otp,
        requestId: state.requestId,
      });

      // Save JWT to secure store
      await SecureStore.setItemAsync('nearby-jwt', response.jwt);

      // Update Zustand store
      login({
        userId: response.userId,
        shopId: response.shopId,
        phone: state.phone,
        token: response.jwt,
      });

      setState((prev) => ({
        ...prev,
        loading: false,
      }));

      logger.info('OTP verification successful');
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : 'Failed to verify OTP';

      // Decrement attempts on failed verification
      if (error instanceof AppError && error.code !== 'OTP_LOCKED') {
        setState((prev) => ({
          ...prev,
          error: message,
          attemptsRemaining: prev.attemptsRemaining - 1,
          loading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          error: message,
          loading: false,
        }));
      }

      logger.error('OTP verification failed', { error: message });
      throw error;
    }
  }, [state.phone, state.otp, state.requestId, login]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Clear JWT from secure store
      await SecureStore.deleteItemAsync('nearby-jwt');

      // Clear Zustand store
      logoutStore();

      setState({
        phone: '',
        otp: '',
        requestId: null,
        loading: false,
        attemptsRemaining: OTP_MAX_ATTEMPTS,
        error: null,
      });

      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }, [logoutStore]);

  return {
    ...state,
    setPhone,
    setOtp,
    requestOtpCode,
    verifyOtpCode,
    logout,
    clearError,
  };
}
