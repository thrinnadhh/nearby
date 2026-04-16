/**
 * Integration tests for authentication flow
 * Tests OTP request → verify → JWT persistence → store update
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import * as authService from '@/services/auth';
import * as secureStore from 'expo-secure-store';

jest.mock('@/services/auth');
jest.mock('expo-secure-store');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSecureStore = secureStore as jest.Mocked<typeof secureStore>;

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes full OTP authentication flow', async () => {
    // Step 1: Request OTP
    mockAuthService.requestOTP.mockResolvedValueOnce({
      requestId: 'req-123',
      expiresIn: 300,
    });

    // Step 2: Verify OTP
    mockAuthService.verifyOTP.mockResolvedValueOnce({
      token: 'jwt-eyJhbGciOiJIUzI1NiJ9...',
      userId: 'user-789',
      shopId: 'shop-456',
      role: 'shop_owner',
    });

    // Step 3: Save JWT
    mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    // Enter phone number
    act(() => {
      result.current.setPhone('9876543210');
    });

    // Request OTP
    let requestId: string | undefined;
    await act(async () => {
      const response = await result.current.requestOtpCode();
      requestId = response.requestId;
    });

    expect(requestId).toBe('req-123');
    expect(result.current.loading).toBe(false);

    // Enter OTP
    act(() => {
      result.current.setOtp('123456');
    });

    // Verify OTP
    await act(async () => {
      await result.current.verifyOtpCode();
    });

    // Verify JWT was saved to secure storage
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'nearby-jwt',
      'jwt-eyJhbGciOiJIUzI1NiJ9...'
    );

    // Verify Zustand store was updated
    const authStore = useAuthStore.getState();
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.userId).toBe('user-789');
    expect(authStore.shopId).toBe('shop-456');
  });

  it('handles OTP request failure gracefully', async () => {
    mockAuthService.requestOTP.mockRejectedValueOnce(
      new Error('OTP_RATE_LIMITED')
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
    });

    await act(async () => {
      try {
        await result.current.requestOtpCode();
      } catch (err) {
        // Expected
      }
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('locks account after 3 failed OTP attempts', async () => {
    // Setup for request OTP
    mockAuthService.requestOTP.mockResolvedValueOnce({
      requestId: 'req-123',
      expiresIn: 300,
    });

    // Setup for 3 failed verify attempts
    mockAuthService.verifyOTP.mockRejectedValue(
      new Error('OTP_INVALID')
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
    });

    // Request OTP
    await act(async () => {
      await result.current.requestOtpCode();
    });

    // Try to verify 3 times with wrong OTP
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.setOtp('000000');
      });

      await act(async () => {
        try {
          await result.current.verifyOtpCode();
        } catch {
          // Expected to fail
        }
      });

      if (i < 2) {
        expect(result.current.attemptsRemaining).toBe(2 - i);
      }
    }

    // Account should be locked
    expect(result.current.attemptsRemaining).toBe(0);

    // Further attempts should fail without calling service
    mockAuthService.verifyOTP.mockClear();

    await act(async () => {
      try {
        await result.current.verifyOtpCode();
      } catch {
        // Expected
      }
    });

    // Service should not have been called (account is locked)
    expect(mockAuthService.verifyOTP).not.toHaveBeenCalled();
  });

  it('handles OTP verification success and store updates', async () => {
    mockAuthService.requestOTP.mockResolvedValueOnce({
      requestId: 'req-456',
      expiresIn: 300,
    });

    mockAuthService.verifyOTP.mockResolvedValueOnce({
      token: 'jwt-token-valid',
      userId: 'user-abc',
      shopId: 'shop-xyz',
      role: 'shop_owner',
    });

    mockSecureStore.setItemAsync.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    // Complete auth flow
    act(() => {
      result.current.setPhone('9875554321');
      result.current.setOtp('654321');
    });

    await act(async () => {
      await result.current.requestOtpCode();
      await result.current.verifyOtpCode();
    });

    // Verify security
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'nearby-jwt',
      'jwt-token-valid'
    );
  });

  it('allows user logout and clears JWT', async () => {
    mockSecureStore.deleteItemAsync.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuth());

    // Setup authenticated state
    const authStore = useAuthStore.getState();
    authStore.setAuthData({
      isAuthenticated: true,
      userId: 'user-123',
      shopId: 'shop-123',
      phone: '9876543210',
      token: 'jwt-token',
      role: 'shop_owner',
    });

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    // Verify JWT was deleted
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'nearby-jwt'
    );

    // Verify auth state cleared
    const clearedStore = useAuthStore.getState();
    expect(clearedStore.isAuthenticated).toBe(false);
  });
});
