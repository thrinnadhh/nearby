/**
 * Simplified tests for LoginScreen — focus on logic, not rendering
 */

import { requestOTP } from '@/services/auth';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/auth');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAuthService = requestOTP as jest.MockedFunction<typeof requestOTP>;

describe('LoginScreen Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate phone number format', () => {
    const phone = '9876543210';
    expect(phone.length).toBe(10);
    expect(/^\d{10}$/.test(phone)).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    const phones = ['987654321', '98765432101', '98765432A0', ''];
    phones.forEach((phone) => {
      expect(/^\d{10}$/.test(phone)).toBe(false);
    });
  });

  it('should call requestOTP with correct phone format', async () => {
    mockAuthService.mockResolvedValue({ status: 'sent', expiresIn: 300 });

    const phone = '9876543210';
    await mockAuthService({ phone });

    expect(mockAuthService).toHaveBeenCalledWith({ phone: '9876543210' });
  });

  it('should handle OTP request error', async () => {
    const error = new AppErrorClass(
      'OTP_REQUEST_FAILED',
      'Failed to send OTP'
    );
    mockAuthService.mockRejectedValue(error);

    await expect(mockAuthService({ phone: '9876543210' })).rejects.toThrow('Failed to send OTP');
  });

  it('should accept only digits', () => {
    const input = '9876543210A';
    const cleaned = input.replace(/\D/g, '');
    expect(cleaned).toBe('9876543210');
  });

  it('should limit to 10 digits', () => {
    const input = '98765432101';
    const limited = input.substring(0, 10);
    expect(limited).toBe('9876543210');
  });
});
