/**
 * useAuth hook — handle OTP flow
 */

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { requestOTP, verifyOTP, registerPartner } from '@/services/auth';
import { AppErrorClass } from '@/types/common';
import logger from '@/utils/logger';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [phone, setPhone] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  const { login, logout } = useAuthStore();

  const sendOtp = async (phoneNumber: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate phone
      if (!/^\d{10}$/.test(phoneNumber)) {
        throw new AppErrorClass('INVALID_PHONE', 'Phone must be 10 digits');
      }

      await requestOTP({ phone: phoneNumber });
      setPhone(phoneNumber);
      setOtpSent(true);
      setAttemptsRemaining(3);

      logger.info('OTP sent', { phone: phoneNumber.slice(-4) });
    } catch (err) {
      const message = err instanceof AppErrorClass ? err.message : 'Failed to send OTP';
      setError(message);
      logger.error('Send OTP failed', { error: message });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndRegister = async (otp: string, asNewPartner: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!phone) {
        throw new AppErrorClass('INVALID_STATE', 'Phone not set');
      }

      if (!/^\d{6}$/.test(otp)) {
        throw new AppErrorClass('INVALID_OTP', 'OTP must be 6 digits');
      }

      let response;

      if (asNewPartner) {
        // Register as new delivery partner
        response = await registerPartner({ phone, otp });
        logger.info('Partner registered', { userId: response.userId });
      } else {
        // Just verify OTP (might be customer or existing user)
        response = await verifyOTP({ phone, otp });
        logger.info('OTP verified', { userId: response.userId });
      }

      login({
        userId: response.userId,
        partnerId: (response as any).partnerId,
        phone: response.phone,
        token: response.token,
      });

      setOtpSent(false);
      setPhone('');

      return response;
    } catch (err) {
      const message = err instanceof AppErrorClass ? err.message : 'Verification failed';
      setError(message);

      // Extract attempts remaining from error message if available
      if (message.includes('attempts remaining')) {
        const match = message.match(/(\d+)\s+attempts?/);
        if (match) {
          setAttemptsRemaining(parseInt(match[1], 10));
        }
      }

      logger.error('Verify/register failed', { error: message });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setPhone('');
    setOtpSent(false);
    setError(null);
    logger.info('User logged out');
  };

  return {
    isLoading,
    error,
    otpSent,
    phone,
    attemptsRemaining,
    sendOtp,
    verifyAndRegister,
    logout: handleLogout,
  };
}
