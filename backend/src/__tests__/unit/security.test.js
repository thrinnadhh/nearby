import { maskPhone, maskAadhaar, maskBankAccount } from '../../utils/security.js';

describe('utils/security.js', () => {
  // ───────────────────────────── maskPhone ─────────────────────────────
  describe('maskPhone', () => {
    it('masks a standard 10-digit phone number', () => {
      expect(maskPhone('+919876543210')).toBe('+91****3210');
    });

    it('masks a phone without country code', () => {
      expect(maskPhone('9876543210')).toBe('+91****3210');
    });

    it('returns N/A for null input', () => {
      expect(maskPhone(null)).toBe('N/A');
    });

    it('returns N/A for undefined input', () => {
      expect(maskPhone(undefined)).toBe('N/A');
    });

    it('returns N/A for empty string', () => {
      expect(maskPhone('')).toBe('N/A');
    });

    it('returns N/A for non-string input', () => {
      expect(maskPhone(1234567890)).toBe('N/A');
    });

    it('returns N/A for phone with fewer than 4 digits', () => {
      expect(maskPhone('123')).toBe('N/A');
    });

    it('masks exactly 4-digit number', () => {
      expect(maskPhone('1234')).toBe('+91****1234');
    });

    it('strips non-digit characters before masking', () => {
      expect(maskPhone('+91-987-654-3210')).toBe('+91****3210');
    });

    it('handles phone with spaces', () => {
      expect(maskPhone('98765 43210')).toBe('+91****3210');
    });
  });

  // ───────────────────────────── maskAadhaar ─────────────────────────────
  describe('maskAadhaar', () => {
    it('masks a standard 12-digit Aadhaar number', () => {
      // last 7 digits of '123456789012' → '6789012'
      expect(maskAadhaar('123456789012')).toBe('****6789012');
    });

    it('masks Aadhaar with spaces', () => {
      // spaces stripped: '123456789012' → last 7 → '6789012'
      expect(maskAadhaar('1234 5678 9012')).toBe('****6789012');
    });

    it('returns N/A for null input', () => {
      expect(maskAadhaar(null)).toBe('N/A');
    });

    it('returns N/A for undefined input', () => {
      expect(maskAadhaar(undefined)).toBe('N/A');
    });

    it('returns N/A for empty string', () => {
      expect(maskAadhaar('')).toBe('N/A');
    });

    it('returns N/A for non-string input', () => {
      expect(maskAadhaar(123456789012)).toBe('N/A');
    });

    it('returns N/A for fewer than 7 digits', () => {
      expect(maskAadhaar('123456')).toBe('N/A');
    });

    it('masks exactly 7 digits', () => {
      expect(maskAadhaar('1234567')).toBe('****1234567');
    });
  });

  // ───────────────────────────── maskBankAccount ─────────────────────────────
  describe('maskBankAccount', () => {
    it('masks a standard 14-digit bank account number', () => {
      expect(maskBankAccount('12345678901234')).toBe('****1234');
    });

    it('masks a shorter account number', () => {
      expect(maskBankAccount('12345678')).toBe('****5678');
    });

    it('returns N/A for null input', () => {
      expect(maskBankAccount(null)).toBe('N/A');
    });

    it('returns N/A for undefined input', () => {
      expect(maskBankAccount(undefined)).toBe('N/A');
    });

    it('returns N/A for empty string', () => {
      expect(maskBankAccount('')).toBe('N/A');
    });

    it('returns N/A for non-string input', () => {
      expect(maskBankAccount(12345678)).toBe('N/A');
    });

    it('returns N/A for fewer than 4 digits', () => {
      expect(maskBankAccount('123')).toBe('N/A');
    });

    it('masks exactly 4-digit account number', () => {
      expect(maskBankAccount('1234')).toBe('****1234');
    });

    it('strips non-digit characters before masking', () => {
      expect(maskBankAccount('1234-5678-9012')).toBe('****9012');
    });
  });
});
