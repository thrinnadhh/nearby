import crypto from 'crypto';

/**
 * Generate a random 4-digit delivery OTP
 * Used for delivery partner hand-off verification
 * @returns {string} 4-digit OTP (e.g., "1234", "0042")
 */
export function generateDeliveryOtp() {
  const otp = crypto.randomInt(0, 10000);
  return otp.toString().padStart(4, '0');
}

/**
 * Verify delivery OTP matches expected value
 * Constant-time comparison to prevent timing attacks
 * @param {string} provided - User-provided OTP
 * @param {string} expected - Expected OTP from DB
 * @returns {boolean} True if OTPs match
 */
export function verifyDeliveryOtp(provided, expected) {
  if (!provided || !expected) return false;
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (provided.length !== 4 || expected.length !== 4) return false;

  // Constant-time comparison
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}
