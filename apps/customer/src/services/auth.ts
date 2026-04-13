import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

// ─── Response shapes (mirrors backend API conventions) ───────────────────────

export interface SendOtpData {
  message: string;
}

export interface VerifyOtpData {
  token: string;
  userId: string;
  phone: string;
  isNewUser: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return (
      (err.response?.data as { error?: { message?: string } })?.error
        ?.message ?? err.message
    );
  }
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

// ─── API calls ───────────────────────────────────────────────────────────────

/** POST /auth/send-otp — sends 6-digit OTP via MSG91 */
export async function sendOtp(phone: string): Promise<void> {
  try {
    await client.post('/auth/send-otp', { phone });
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

/** POST /auth/verify-otp — verifies OTP and returns JWT */
export async function verifyOtp(
  phone: string,
  otp: string
): Promise<VerifyOtpData> {
  try {
    const { data } = await client.post<{ success: boolean; data: VerifyOtpData }>(
      '/auth/verify-otp',
      { phone, otp }
    );
    return data.data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}
