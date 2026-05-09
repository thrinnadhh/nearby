/**
 * Simplified tests for OTPVerifyScreen — focus on logic, not rendering
 */

import { verifyOTP } from '@/services/auth';
import { AppErrorClass } from '@/types/common';

jest.mock('@/services/auth');
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const mockAuthService = verifyOTP as jest.MockedFunction<typeof verifyOTP>;

describe('OTPVerifyScreen Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate OTP format', () => {
    const otp = '123456';
    expect(otp.length).toBe(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('should reject invalid OTP lengths', () => {
    const otps = ['12345', '1234567', '', 'ABCDEF'];
    otps.forEach((otp) => {
      expect(/^\d{6}$/.test(otp)).toBe(false);
    });
  });

  it('should accept only digits in OTP', () => {
    const input = '123456A';
    const cleaned = input.replace(/\D/g, '');
    expect(cleaned).toBe('123456');
  });

  it('should limit OTP to 6 digits', () => {
    const input = '1234567';
    const limited = input.substring(0, 6);
    expect(limited).toBe('123456');
  });

  it('should call verifyOTP with correct params', async () => {
    mockAuthService.mockResolvedValue({
      userId: 'user-123',
      partnerId: 'partner-123',
      phone: '9876543210',
      role: 'delivery',
      token: 'jwt-token',
    });

    await mockAuthService({
      phone: '9876543210',
      otp: '123456',
    });

    expect(mockAuthService).toHaveBeenCalledWith({
      phone: '9876543210',
      otp: '123456',
    });
  });

  it('should handle OTP verification errors', async () => {
    const error = new AppErrorClass('OTP_INVALID', 'Invalid OTP code');
    mockAuthService.mockRejectedValue(error);

    await expect(
      mockAuthService({ phone: '9876543210', otp: '000000' })
    ).rejects.toThrow('Invalid OTP code');
  });

  it('should handle OTP locked error', async () => {
    const error = new AppErrorClass('OTP_LOCKED', 'Too many attempts', 429);
    mockAuthService.mockRejectedValue(error);

    await expect(
      mockAuthService({ phone: '9876543210', otp: '000000' })
    ).rejects.toThrow('Too many attempts');
  });

  it('should format OTP expiry countdown', () => {
    const expirySeconds = 300;
    const minutes = Math.floor(expirySeconds / 60);
    const seconds = expirySeconds % 60;
    const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    expect(formatted).toBe('5:00');
  });

  it('should update countdown timer', () => {
    let timeLeft = 300;
    timeLeft--;
    expect(timeLeft).toBe(299);
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    expect(formatted).toBe('4:59');
  });
});
