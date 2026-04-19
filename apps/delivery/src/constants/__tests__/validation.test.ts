/**
 * Unit tests for validation schemas (Task 13.1)
 */

import {
  phoneSchema,
  otpSchema,
  aadhaarSchema,
  bankDetailsSchema,
} from '@/constants/validation';

describe('Validation Schemas', () => {
  describe('phoneSchema', () => {
    it('validates correct 10-digit phone', () => {
      const { error } = phoneSchema.validate({ phone: '9876543210' });
      expect(error).toBeUndefined();
    });

    it('rejects non-10-digit phone', () => {
      const { error } = phoneSchema.validate({ phone: '987654321' });
      expect(error).toBeDefined();
    });

    it('rejects phone with letters', () => {
      const { error } = phoneSchema.validate({ phone: '987654321a' });
      expect(error).toBeDefined();
    });
  });

  describe('otpSchema', () => {
    it('validates correct 6-digit OTP', () => {
      const { error } = otpSchema.validate({
        phone: '9876543210',
        otp: '123456',
      });
      expect(error).toBeUndefined();
    });

    it('rejects non-6-digit OTP', () => {
      const { error } = otpSchema.validate({
        phone: '9876543210',
        otp: '12345',
      });
      expect(error).toBeDefined();
    });
  });

  describe('aadhaarSchema', () => {
    it('validates correct 4-digit aadhaar', () => {
      const { error } = aadhaarSchema.validate({ aadhaarLast4: '1234' });
      expect(error).toBeUndefined();
    });

    it('rejects non-4-digit aadhaar', () => {
      const { error } = aadhaarSchema.validate({ aadhaarLast4: '123' });
      expect(error).toBeDefined();
    });
  });

  describe('bankDetailsSchema', () => {
    it('validates correct bank details', () => {
      const { error } = bankDetailsSchema.validate({
        bankAccountNumber: '12345678901',
        bankIFSC: 'HDFC0001234',
        bankAccountName: 'John Doe',
      });
      expect(error).toBeUndefined();
    });

    it('rejects invalid IFSC code', () => {
      const { error } = bankDetailsSchema.validate({
        bankAccountNumber: '12345678901',
        bankIFSC: 'INVALID',
        bankAccountName: 'John Doe',
      });
      expect(error).toBeDefined();
    });

    it('rejects short account number', () => {
      const { error } = bankDetailsSchema.validate({
        bankAccountNumber: '12345',
        bankIFSC: 'HDFC0001234',
        bankAccountName: 'John Doe',
      });
      expect(error).toBeDefined();
    });
  });
});
