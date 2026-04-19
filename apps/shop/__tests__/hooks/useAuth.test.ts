/**
 * Unit tests for useAuth hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import * as authService from '@/services/auth';
import * as SecureStore from 'expo-secure-store';
import { AppError } from '@/types/common';

jest.mock('@/store/auth');
jest.mock('@/services/auth');

const mockLogin = jest.fn();
const mockLogout = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useAuthStore as unknown as jest.Mock).mockReturnValue({ login: mockLogin, logout: mockLogout });
});

describe('requestOtpCode', () => {
  it('calls requestOTP service with phone and stores requestId', async () => {
    (authService.requestOTP as jest.Mock).mockResolvedValueOnce({
      requestId: 'req-123',
      expiresAt: '2026-04-18T10:00:00Z',
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
    });

    await act(async () => {
      await result.current.requestOtpCode();
    });

    expect(authService.requestOTP).toHaveBeenCalledWith({ phone: '9876543210' });
    expect(result.current.requestId).toBe('req-123');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets error state on invalid phone', async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('123'); // invalid — too short
    });

    await act(async () => {
      try {
        await result.current.requestOtpCode();
      } catch (_) {}
    });

    expect(result.current.error).toBeTruthy();
    expect(authService.requestOTP).not.toHaveBeenCalled();
  });

  it('sets error on service failure', async () => {
    (authService.requestOTP as jest.Mock).mockRejectedValueOnce(
      new AppError('OTP_REQUEST_FAILED', 'Failed to send OTP')
    );

    const { result } = renderHook(() => useAuth());
    act(() => { result.current.setPhone('9876543210'); });

    await act(async () => {
      try {
        await result.current.requestOtpCode();
      } catch (_) {}
    });

    expect(result.current.error).toBe('Failed to send OTP');
    expect(result.current.loading).toBe(false);
  });
});

describe('verifyOtpCode', () => {
  it('verifies OTP, saves JWT, calls login', async () => {
    (authService.verifyOTP as jest.Mock).mockResolvedValueOnce({
      jwt: 'jwt-token',
      userId: 'user-1',
      shopId: 'shop-1',
    });

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
      result.current.setOtp('123456');
    });

    // Need to manually set requestId by simulating requestOTP first
    (authService.requestOTP as jest.Mock).mockResolvedValueOnce({
      requestId: 'req-abc',
      expiresAt: '2026-04-18T10:00:00Z',
    });
    await act(async () => {
      await result.current.requestOtpCode();
    });

    await act(async () => {
      await result.current.verifyOtpCode();
    });

    expect(authService.verifyOTP).toHaveBeenCalledWith({
      phone: '9876543210',
      otp: '123456',
      requestId: 'req-abc',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('nearby-jwt', 'jwt-token');
    expect(mockLogin).toHaveBeenCalledWith({
      userId: 'user-1',
      shopId: 'shop-1',
      phone: '9876543210',
      token: 'jwt-token',
    });
  });

  it('sets error on invalid OTP format', async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
      result.current.setOtp('123'); // invalid — too short
    });

    await act(async () => {
      try {
        await result.current.verifyOtpCode();
      } catch (_) {}
    });

    expect(result.current.error).toBeTruthy();
    expect(authService.verifyOTP).not.toHaveBeenCalled();
  });

  it('decrements attemptsRemaining on failed verify', async () => {
    (authService.requestOTP as jest.Mock).mockResolvedValueOnce({
      requestId: 'req-abc',
      expiresAt: '2026-04-18T10:00:00Z',
    });
    (authService.verifyOTP as jest.Mock).mockRejectedValueOnce(
      new AppError('OTP_INVALID', 'Invalid OTP')
    );

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setPhone('9876543210');
      result.current.setOtp('000000');
    });

    await act(async () => { await result.current.requestOtpCode(); });

    const before = result.current.attemptsRemaining;
    await act(async () => {
      try { await result.current.verifyOtpCode(); } catch (_) {}
    });

    expect(result.current.attemptsRemaining).toBe(before - 1);
  });
});

describe('logout', () => {
  it('deletes JWT from secure store and clears auth store', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('nearby-jwt');
    expect(mockLogout).toHaveBeenCalled();
  });
});

describe('clearError', () => {
  it('clears the error state', async () => {
    (authService.requestOTP as jest.Mock).mockRejectedValueOnce(
      new AppError('OTP_REQUEST_FAILED', 'Failed')
    );
    const { result } = renderHook(() => useAuth());

    act(() => { result.current.setPhone('9876543210'); });
    await act(async () => {
      try { await result.current.requestOtpCode(); } catch (_) {}
    });

    expect(result.current.error).toBeTruthy();

    act(() => { result.current.clearError(); });
    expect(result.current.error).toBeNull();
  });
});
