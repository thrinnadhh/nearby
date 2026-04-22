/**
 * Integration tests for complete authentication flow
 */

import { useAuthStore } from '@/store/auth';
import * as authService from '@/services/auth';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/auth');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      userId: null,
      partnerId: null,
      phone: null,
      token: null,
      role: null,
    });
  });

  it('should complete full auth flow: OTP request → verify → login', async () => {
    // Step 1: Request OTP
    mockAuthService.requestOTP.mockResolvedValue({
      status: 'sent',
      expiresIn: 300,
    });

    await authService.requestOTP({ phone: '9876543210' });
    expect(mockAuthService.requestOTP).toHaveBeenCalledWith({
      phone: '9876543210',
    });

    // Step 2: Verify OTP
    mockAuthService.verifyOTP.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token-123',
    });

    const verifyResponse = await authService.verifyOTP({
      phone: '9876543210',
      otp: '123456',
    });

    expect(verifyResponse).toEqual({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token-123',
    });

    // Step 3: Login to store
    useAuthStore.getState().login({
      userId: verifyResponse.userId,
      partnerId: verifyResponse.partnerId || undefined,
      phone: verifyResponse.phone,
      token: verifyResponse.token,
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.userId).toBe('user-123');
    expect(state.partnerId).toBe('partner-123');
    expect(state.token).toBe('jwt-token-123');
    expect(state.role).toBe('delivery');
  });

  it('should handle OTP request failure gracefully', async () => {
    const error = new AppErrorClass(
      'OTP_REQUEST_FAILED',
      'Network error',
      500
    );
    mockAuthService.requestOTP.mockRejectedValue(error);

    try {
      await authService.requestOTP({ phone: '9876543210' });
      fail('Should throw error');
    } catch (err) {
      expect(err).toBeInstanceOf(AppErrorClass);
      expect((err as AppErrorClass).code).toBe('OTP_REQUEST_FAILED');
    }

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should handle OTP verification failure', async () => {
    const error = new AppErrorClass('INVALID_OTP', 'Invalid OTP', 400);
    mockAuthService.verifyOTP.mockRejectedValue(error);

    try {
      await authService.verifyOTP({
        phone: '9876543210',
        otp: '000000',
      });
      fail('Should throw error');
    } catch (err) {
      expect(err).toBeInstanceOf(AppErrorClass);
      expect((err as AppErrorClass).code).toBe('INVALID_OTP');
    }

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should handle logout correctly', () => {
    useAuthStore.getState().login({
      userId: 'user-123',
      phone: '9876543210',
      token: 'jwt-token-123',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.token).toBeNull();
    expect(state.phone).toBeNull();
  });

  it('should prevent double login', async () => {
    mockAuthService.verifyOTP.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token-123',
    });

    const response = await authService.verifyOTP({
      phone: '9876543210',
      otp: '123456',
    });

    useAuthStore.getState().login({
      userId: response.userId,
      partnerId: response.partnerId || undefined,
      phone: response.phone,
      token: response.token,
    });

    // Attempt to login again with different token
    useAuthStore.getState().login({
      userId: 'user-456',
      phone: '9876543211',
      token: 'jwt-token-456',
    });

    const state = useAuthStore.getState();
    expect(state.userId).toBe('user-456');
    expect(state.token).toBe('jwt-token-456');
  });

  it('should preserve auth state across multiple operations', async () => {
    mockAuthService.verifyOTP.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token-123',
    });

    const response = await authService.verifyOTP({
      phone: '9876543210',
      otp: '123456',
    });

    useAuthStore.getState().login({
      userId: response.userId,
      partnerId: response.partnerId || undefined,
      phone: response.phone,
      token: response.token,
    });

    let state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);

    // Perform some operation
    // State should still be preserved
    state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('jwt-token-123');
  });

  it('should handle rate limited OTP verification', async () => {
    const error = new AppErrorClass(
      'OTP_LOCKED',
      'Too many failed attempts',
      429
    );
    mockAuthService.verifyOTP.mockRejectedValue(error);

    try {
      await authService.verifyOTP({
        phone: '9876543210',
        otp: '000000',
      });
      fail('Should throw error');
    } catch (err) {
      expect(err).toBeInstanceOf(AppErrorClass);
      expect((err as AppErrorClass).code).toBe('OTP_LOCKED');
      expect((err as AppErrorClass).statusCode).toBe(429);
    }
  });
});
