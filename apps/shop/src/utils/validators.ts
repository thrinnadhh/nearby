/**
 * Input validators for common data types
 */

/**
 * Validate Indian phone number (10 digits)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) {
    return { valid: false, error: 'Phone number must be 10 digits' };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return {
      valid: false,
      error: 'Phone number must start with 6, 7, 8, or 9',
    };
  }
  return { valid: true };
}

/**
 * Validate OTP (6 digits)
 */
export function validateOTP(otp: string): { valid: boolean; error?: string } {
  const cleaned = otp.replace(/\D/g, '');
  if (cleaned.length !== 6) {
    return { valid: false, error: 'OTP must be 6 digits' };
  }
  return { valid: true };
}

/**
 * Validate shop name (non-empty, 2-50 chars)
 */
export function validateShopName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Shop name is required' };
  }
  if (name.length < 2 || name.length > 50) {
    return { valid: false, error: 'Shop name must be 2-50 characters' };
  }
  return { valid: true };
}

/**
 * Validate email (basic regex)
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email address' };
  }
  return { valid: true };
}

/**
 * Validate file type for image upload
 */
export function validateImageFile(
  mimeType: string
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are supported',
    };
  }
  return { valid: true };
}

/**
 * Validate file size (max 5MB)
 */
export function validateFileSize(
  sizeInBytes: number,
  maxMB: number = 5
): { valid: boolean; error?: string } {
  const maxBytes = maxMB * 1024 * 1024;
  if (sizeInBytes > maxBytes) {
    return { valid: false, error: `File must be less than ${maxMB}MB` };
  }
  return { valid: true };
}
