/**
 * Unit tests for useAuth hook (Task 13.1)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as authService from '@/services/auth';

jest.mock('@/services/auth');

describe('useAuth', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.otpSent).toBe(false);
    expect(result.current.phone).toBe('');
    expect(result.current.attemptsRemaining).toBe(3);
  });

  it('sends OTP successfully', async () => {
    const mockSendOtp = authService.requestOTP as jest.Mock;
    mockSendOtp.mockResolvedValueOnce({ status: 'otp_sent', expiresIn: 300 });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.sendOtp('9876543210');
    });

    await waitFor(() => {
      expect(result.current.otpSent).toBe(true);
      expect(result.current.phone).toBe('9876543210');
      expect(result.current.error).toBeNull();
    });
  });

  it('validates phone format', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.sendOtp('invalid');
      } catch (e) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.otpSent).toBe(false);
    });
  });

  it('handles OTP send failure', async () => {
    const mockSendOtp = authService.requestOTP as jest.Mock;
    mockSendOtp.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.sendOtp('9876543210');
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.otpSent).toBe(false);
    });
  });
});
