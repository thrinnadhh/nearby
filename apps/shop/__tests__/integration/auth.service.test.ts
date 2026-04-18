/**
 * Integration tests for auth service — requestOTP and verifyOTP
 */

jest.mock('@/services/api', () => ({
  client: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import { client } from '@/services/api';
import { requestOTP, verifyOTP } from '@/services/auth';
import { AppError } from '@/types/common';

const mockPost = client.post as jest.MockedFunction<typeof client.post>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestOTP', () => {
  it('returns requestId on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: { requestId: 'req-123', expiresAt: '2026-04-18T10:00:00Z' },
      },
    });

    const result = await requestOTP({ phone: '9876543210' });

    expect(result.requestId).toBe('req-123');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('throws AppError on network failure', async () => {
    const axiosError = Object.assign(new Error('Network Error'), {
      isAxiosError: true,
      response: undefined,
    });
    mockPost.mockRejectedValueOnce(axiosError);

    await expect(requestOTP({ phone: '9876543210' })).rejects.toThrow(AppError);
  });

  it('extracts server error message from response', async () => {
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        status: 429,
        data: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      },
    });
    mockPost.mockRejectedValueOnce(axiosError);

    const error = await requestOTP({ phone: '9876543210' }).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe('Too many requests');
  });
});

describe('verifyOTP', () => {
  const payload = { phone: '9876543210', otp: '123456', requestId: 'req-123' };

  it('returns jwt and userId on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: { jwt: 'jwt-token', userId: 'user-1', shopId: 'shop-1' },
      },
    });

    const result = await verifyOTP(payload);

    expect(result.jwt).toBe('jwt-token');
    expect(result.userId).toBe('user-1');
    expect(result.shopId).toBe('shop-1');
  });

  it('throws AppError with OTP_INVALID code when server returns OTP_INVALID', async () => {
    const axiosError = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: { code: 'OTP_INVALID', message: 'Invalid OTP' } },
      },
    });
    mockPost.mockRejectedValueOnce(axiosError);

    const error = await verifyOTP(payload).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OTP_INVALID');
  });

  it('throws AppError with OTP_EXPIRED code', async () => {
    const axiosError = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: {
        status: 400,
        data: { error: { code: 'OTP_EXPIRED', message: 'OTP expired' } },
      },
    });
    mockPost.mockRejectedValueOnce(axiosError);

    const error = await verifyOTP(payload).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OTP_EXPIRED');
  });

  it('throws AppError with OTP_LOCKED code', async () => {
    const axiosError = Object.assign(new Error('Too Many Requests'), {
      isAxiosError: true,
      response: {
        status: 429,
        data: { error: { code: 'OTP_LOCKED', message: 'Account locked' } },
      },
    });
    mockPost.mockRejectedValueOnce(axiosError);

    const error = await verifyOTP(payload).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OTP_LOCKED');
  });

  it('throws generic AppError on unknown network error', async () => {
    mockPost.mockRejectedValueOnce(new Error('Unknown error'));

    const error = await verifyOTP(payload).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OTP_VERIFY_FAILED');
  });
});
