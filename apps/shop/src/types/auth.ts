/**
 * Authentication types for Shop Owner app
 */

export interface OTPRequestPayload {
  phone: string;
}

export interface OTPRequestResponse {
  requestId: string;
  success: boolean;
}

export interface OTPVerifyPayload {
  phone: string;
  otp: string;
  requestId: string;
}

export interface OTPVerifyResponse {
  jwt: string;
  userId: string;
  shopId: string;
  role: 'shop_owner';
}

export interface JWTPayload {
  userId: string;
  shopId: string;
  phone: string;
  role: 'shop_owner';
  iat: number;
  exp: number;
}
