/**
 * API configuration — all API constants loaded from environment variables
 * EXPO_PUBLIC_ prefix is required for Expo to expose env vars to the client
 */

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `${key} is not set. Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
};

export const API_BASE_URL = requireEnv('EXPO_PUBLIC_API_URL');
export const SOCKET_URL = requireEnv('EXPO_PUBLIC_SOCKET_URL');
export const API_TIMEOUT = 15_000;

// API endpoints
export const AUTH_ENDPOINTS = {
  OTP_REQUEST: '/auth/otp-request',
  OTP_VERIFY: '/auth/otp-verify',
};

export const SHOP_ENDPOINTS = {
  GET_PROFILE: '/shops/:id',
  UPDATE_PROFILE: '/shops/:id',
  TOGGLE_OPEN_CLOSE: '/shops/:id',
};

export const ORDER_ENDPOINTS = {
  LIST_ORDERS: '/orders',
  GET_ORDER: '/orders/:id',
  ACCEPT_ORDER: '/orders/:id/accept',
  REJECT_ORDER: '/orders/:id/reject',
};
