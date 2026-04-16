/**
 * Deep-link routing configuration and route constants
 */

export const ROUTES = {
  // Auth
  LOGIN: '(auth)/login',
  OTP_VERIFY: '(auth)/otp-verify',

  // Main app
  HOME: '(tabs)',
  ORDERS: '(tabs)/orders',
  ORDERS_DETAIL: '(tabs)/orders/[id]',
  PROFILE: '(tabs)/profile',

  // Splash
  SPLASH: '/',
};

export const DEEP_LINKS = {
  ORDER: 'nearby-shop://orders/:id',
  PROFILE: 'nearby-shop://profile',
};
