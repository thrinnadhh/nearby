/**
 * Error code to user-friendly message mappings
 * Must match backend error codes from backend/src/utils/errors.js
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  INVALID_PHONE: 'Please enter a valid 10-digit phone number',
  OTP_INVALID: 'Invalid OTP. Please try again.',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_LOCKED: 'Too many failed attempts. Please try again later.',
  PHONE_NOT_FOUND: 'Phone number not registered. Please sign up first.',
  AUTH_FAILED: 'Authentication failed. Please try again.',

  // Shop errors
  SHOP_NOT_FOUND: 'Shop not found',
  SHOP_NOT_AUTHORIZED: 'You are not authorized to access this shop',
  KYC_PENDING: 'Your KYC is still under review',
  KYC_REJECTED: 'Your KYC was rejected. Please try again.',

  // Order errors
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_ALREADY_ACCEPTED: 'Order has already been accepted by another shop',
  ORDER_EXPIRED: 'Order acceptance window has expired',
  ORDER_CANNOT_REJECT: 'This order cannot be rejected',
  ORDER_STATUS_INVALID: 'Invalid order status transition',

  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',

  // Generic errors
  VALIDATION_ERROR: 'Please check your input and try again',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}
