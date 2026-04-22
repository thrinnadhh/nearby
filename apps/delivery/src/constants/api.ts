/**
 * API constants and endpoints
 */

const isDev = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDev
  ? 'http://localhost:3000/api/v1'
  : 'https://api.nearby.app/api/v1';

export const API_TIMEOUT = 30000; // 30 seconds

export const AUTH_ENDPOINTS = {
  OTP_REQUEST: '/auth/send-otp',
  OTP_VERIFY: '/auth/verify-otp',
  PARTNER_REGISTER: '/auth/partner/register',
};

export const PARTNER_ENDPOINTS = {
  KYC_SUBMIT: '/delivery-partners/:id/kyc',
  UPDATE_PROFILE: '/delivery-partners/:id',
  TOGGLE_ONLINE: '/delivery-partners/:id/toggle-online',
};

export const SOCKET_URL = isDev
  ? 'http://localhost:3001'
  : 'https://api.nearby.app';
