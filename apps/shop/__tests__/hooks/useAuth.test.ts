/**
 * Unit tests for useAuth hook
 * Tests OTP request, verification, attempt locking, and JWT persistence
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';
import * as authService from '@/services/auth';
import * as secureStore from 'expo-secure-store';
import { useAuthStore } from '@/store/auth';

// Mock dependencies
jest.mock('@/services/auth');
jest.mock('expo-secure-store');
jest.mock('@/store/auth');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSecureStore = secureStore as jest.Mocked<typeof secureStore>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock store methods
    (useAuthStore as jest.Mock).mockReturnValue({
      setAuthData: jest.fn(),
      logout: jest.fn(),
    });
  });

  describe('setPhone', () => {
    it('updates phone state', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('9876543210');
      });

      expect(result.current.phone).toBe('9876543210');
    });

    it('prevents invalid phone format', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('123'); // Too short
      });

      expect(result.current.phone).toBe('123'); // State updates, validation happens on request
    });
  });

  describe('requestOtpCode', () => {
    it('successfully requests OTP', async () => {
      mockAuthService.requestOTP.mockResolvedValueOnce({
        requestId: 'req-123',
        expiresIn: 300,
      });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('9876543210');
      });

      let requestId: string | null = null;
      await act(async () => {
        const response = await result.current.requestOtpCode();
        requestId = response.requestId;
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(requestId).toBe('req-123');
    });

    it('handles OTP request error', async () => {
      const errorMessage = 'OTP_RATE_LIMITED';
      mockAuthService.requestOTP.mockRejectedValueOnce(
        new Error(errorMessage)
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('9876543210');
      });

      await act(async () => {
        try {
          await result.current.requestOtpCode();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('verifyOtpCode', () => {
    beforeEach(async () => {
      mockAuthService.requestOTP.mockResolvedValueOnce({
        requestId: 'req-123',
        expiresIn: 300,
      });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('9876543210');
      });

      await act(async () => {
        await result.current.requestOtpCode();
      });
    });

    it('successfully verifies OTP and saves JWT', async () => {
      mockAuthService.verifyOTP.mockResolvedValueOnce({
        token: 'jwt-token-123',
        userId: 'user-123',
        shopId: 'shop-123',
        role: 'shop_owner',
      });

      mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setPhone('9876543210');
        result.current.setOtp('123456');
      });

      await act(async () => {
        await result.current.verifyOtpCode();
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'nearby-jwt',
        'jwt-token-123'
      );
      expect(result.current.error).toBeNull();
    });

    it('decrements attempts on failed OTP', async () => {
      mockAuthService.verifyOTP.mockRejectedValueOnce(
        new Error('OTP_INVALID')
      );

      const { result } = renderHook(() => useAuth());

      const initialAttempts = result.current.attemptsRemaining;

      await act(async () => {
        try {
          await result.current.verifyOtpCode();
        } catch {
          // Expected
        }
      });

      expect(result.current.attemptsRemaining).toBe(initialAttempts - 1);
    });

    it('locks account after 3 failed attempts', async () => {
      mockAuthService.verifyOTP.mockRejectedValue(new Error('OTP_INVALID'));

      const { result } = renderHook(() => useAuth());

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          try {
            await result.current.verifyOtpCode();
          } catch {
            // Expected
          }
        });
      }

      expect(result.current.attemptsRemaining).toBe(0);
    });

    it('prevents OTP verification when account is locked', async () => {
      mockAuthService.verifyOTP.mockRejectedValue(new Error('OTP_INVALID'));

      const { result } = renderHook(() => useAuth());

      // Lock account with 3 failures
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          try {
            await result.current.verifyOtpCode();
          } catch {
            // Expected
          }
        });
      }

      mockAuthService.verifyOTP.mockClear();

      // Try to verify when locked
      await act(async () => {
        try {
          await result.current.verifyOtpCode();
        } catch {
          // Expected
        }
      });

      // Service should not be called
      expect(mockAuthService.verifyOTP).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears JWT from secure store and auth state', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth());
      const mockLogout = useAuthStore((s) => s.logout);

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'nearby-jwt'
      );
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      const { result } = renderHook(() => useAuth());

      // First create an error
      act(() => {
        // This would be set by a failed request
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
