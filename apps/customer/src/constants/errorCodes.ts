/**
 * Error codes mapping — server error codes to user-friendly messages
 */

export const errorMessages: Record<string, string> = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid phone number or password',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_INVALID: 'Invalid OTP. Please try again.',
  OTP_LOCKED: 'Too many failed attempts. Please try again later.',
  NOT_AUTHENTICATED: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  TOKEN_INVALID: 'Invalid authentication token. Please log in again.',

  // Profile errors
  PROFILE_NOT_FOUND: 'User profile not found.',
  PROFILE_UPDATE_FAILED: 'Failed to update profile. Please try again.',

  // Order errors
  ORDER_NOT_FOUND: 'Order not found.',
  ORDER_ALREADY_CANCELLED: 'This order has already been cancelled.',
  ORDER_CANNOT_BE_CANCELLED: 'This order cannot be cancelled at this stage.',
  ORDER_NOT_DELIVERED: 'You can only review delivered orders.',
  ORDER_CREATION_FAILED: 'Failed to create order. Please try again.',

  // Review errors
  REVIEW_ALREADY_EXISTS: 'You have already reviewed this order.',
  REVIEW_CREATION_FAILED: 'Failed to submit review. Please try again.',
  REVIEW_NOT_FOUND: 'Review not found.',

  // Payment errors
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  PAYMENT_PROCESSING: 'Payment is being processed. Please wait...',
  INVALID_PAYMENT_METHOD: 'Invalid payment method.',
  PAYMENT_TIMEOUT: 'Payment took too long. Please try again.',

  // Network errors
  NETWORK_ERROR: 'Network connection failed. Please check your internet and try again.',
  TIMEOUT_ERROR: 'Connection timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',

  // Generic fallback
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export function getUserFriendlyError(code: string, fallback?: string): string {
  return errorMessages[code] || fallback || errorMessages.UNKNOWN_ERROR;
}
