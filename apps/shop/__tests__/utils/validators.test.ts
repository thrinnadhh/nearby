/**
 * Unit tests for input validators
 */

import {
  validatePhone,
  validateOTP,
  validateShopName,
  validateEmail,
  validateImageFile,
  validateFileSize,
} from '@/utils/validators';

describe('validatePhone', () => {
  it('accepts valid 10-digit Indian number starting with 9', () => {
    expect(validatePhone('9876543210').valid).toBe(true);
  });

  it('accepts numbers starting with 6, 7, 8', () => {
    expect(validatePhone('6000000000').valid).toBe(true);
    expect(validatePhone('7000000000').valid).toBe(true);
    expect(validatePhone('8000000000').valid).toBe(true);
  });

  it('rejects numbers with wrong length', () => {
    const result = validatePhone('98765');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects numbers starting with 1-5', () => {
    const result = validatePhone('1234567890');
    expect(result.valid).toBe(false);
  });

  it('strips non-digits before validating', () => {
    // Strips dashes — 9876543210 is exactly 10 digits
    expect(validatePhone('98765-43210').valid).toBe(true);
  });
});

describe('validateOTP', () => {
  it('accepts 6-digit OTP', () => {
    expect(validateOTP('123456').valid).toBe(true);
  });

  it('rejects OTP with wrong length', () => {
    expect(validateOTP('12345').valid).toBe(false);
    expect(validateOTP('1234567').valid).toBe(false);
  });

  it('strips non-digits before validating', () => {
    expect(validateOTP('12-34-56').valid).toBe(true);
  });
});

describe('validateShopName', () => {
  it('accepts valid shop name', () => {
    expect(validateShopName('My Kirana').valid).toBe(true);
  });

  it('rejects empty or whitespace-only name', () => {
    expect(validateShopName('').valid).toBe(false);
    expect(validateShopName('   ').valid).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    expect(validateShopName('A').valid).toBe(false);
  });

  it('rejects name longer than 50 characters', () => {
    expect(validateShopName('A'.repeat(51)).valid).toBe(false);
  });

  it('accepts exactly 2 and 50 character names', () => {
    expect(validateShopName('AB').valid).toBe(true);
    expect(validateShopName('A'.repeat(50)).valid).toBe(true);
  });
});

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });

  it('rejects email without @ symbol', () => {
    expect(validateEmail('userexample.com').valid).toBe(false);
  });

  it('rejects email without domain', () => {
    expect(validateEmail('user@').valid).toBe(false);
  });

  it('rejects plain string', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
  });
});

describe('validateImageFile', () => {
  it('accepts jpeg, png, and webp', () => {
    expect(validateImageFile('image/jpeg').valid).toBe(true);
    expect(validateImageFile('image/png').valid).toBe(true);
    expect(validateImageFile('image/webp').valid).toBe(true);
  });

  it('rejects pdf and gif', () => {
    expect(validateImageFile('application/pdf').valid).toBe(false);
    expect(validateImageFile('image/gif').valid).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('accepts file within default 5MB limit', () => {
    expect(validateFileSize(4 * 1024 * 1024).valid).toBe(true);
  });

  it('rejects file exceeding 5MB default limit', () => {
    expect(validateFileSize(6 * 1024 * 1024).valid).toBe(false);
  });

  it('respects custom maxMB parameter', () => {
    expect(validateFileSize(2 * 1024 * 1024, 1).valid).toBe(false);
    expect(validateFileSize(500 * 1024, 1).valid).toBe(true);
  });
});
