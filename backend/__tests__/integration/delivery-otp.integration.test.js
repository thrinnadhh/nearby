import { describe, it, expect, beforeAll } from '@jest/globals';
import { generateDeliveryOtp, verifyDeliveryOtp } from '../../src/utils/otpGenerator.js';

describe('Delivery OTP', () => {
  describe('generateDeliveryOtp', () => {
    it('should generate 4-digit OTP', () => {
      const otp = generateDeliveryOtp();
      expect(otp).toMatch(/^\d{4}$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateDeliveryOtp();
      const otp2 = generateDeliveryOtp();
      expect(otp1).not.toBe(otp2);
    });

    it('should pad leading zeros', () => {
      let generated = false;
      for (let i = 0; i < 1000; i++) {
        const otp = generateDeliveryOtp();
        if (otp.startsWith('0')) {
          generated = true;
          break;
        }
      }
      expect(generated).toBe(true);
    });
  });

  describe('verifyDeliveryOtp', () => {
    it('should verify matching OTP', () => {
      const otp = '1234';
      const result = verifyDeliveryOtp(otp, otp);
      expect(result).toBe(true);
    });

    it('should reject non-matching OTP', () => {
      const result = verifyDeliveryOtp('1234', '5678');
      expect(result).toBe(false);
    });

    it('should reject invalid OTP length', () => {
      expect(verifyDeliveryOtp('123', '1234')).toBe(false);
      expect(verifyDeliveryOtp('12345', '1234')).toBe(false);
    });

    it('should reject non-digit OTP', () => {
      expect(verifyDeliveryOtp('abcd', '1234')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(verifyDeliveryOtp(null, '1234')).toBe(false);
      expect(verifyDeliveryOtp('1234', undefined)).toBe(false);
    });
  });
});
