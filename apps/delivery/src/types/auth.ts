/**
 * Authentication types
 */

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  partnerId: string | null;
  phone: string | null;
  token: string | null;
  role: 'delivery' | null;
  _hasHydrated: boolean;
}

export interface OTPRequestPayload {
  phone: string; // 10-digit phone
}

export interface OTPRequestResponse {
  status: string;
  expiresIn: number;
}

export interface OTPVerifyPayload {
  phone: string; // 10-digit phone
  otp: string; // 6-digit OTP
}

export interface OTPVerifyResponse {
  userId: string;
  partnerId: string | null;
  phone: string;
  role: 'delivery';
  token: string;
}

export interface PartnerRegisterPayload {
  phone: string; // 10-digit phone
  otp: string; // 6-digit OTP
}

export interface PartnerRegisterResponse {
  userId: string;
  phone: string;
  role: 'delivery';
  token: string;
}
