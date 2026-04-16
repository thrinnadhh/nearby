/**
 * Profile API service — user profile, addresses, logout
 * Never stores JWT in service — passed in by caller (hooks)
 */

import { client } from './api';
import type { Profile, SavedAddress, UpdateProfilePayload } from '@/types/profile';

interface ProfileResponse {
  success: boolean;
  data?: Profile;
  error?: { code: string; message: string };
}

interface SavedAddressesResponse {
  success: boolean;
  data?: SavedAddress[];
  error?: { code: string; message: string };
}

/**
 * Fetch current user's profile data
 * @throws Error if API fails
 */
export async function getProfile(token: string): Promise<Profile> {
  try {
    const response = await client.get<ProfileResponse>('/api/v1/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch profile');
    }

    return response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to fetch profile';
    throw new Error(message);
  }
}

/**
 * Fetch user's saved delivery addresses
 * @throws Error if API fails
 */
export async function getSavedAddresses(token: string): Promise<SavedAddress[]> {
  try {
    const response = await client.get<SavedAddressesResponse>('/api/v1/auth/addresses', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to fetch addresses');
    }

    return response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to fetch addresses';
    throw new Error(message);
  }
}

/**
 * Update user's profile (name, avatar, etc.)
 * @throws Error if API fails
 */
export async function updateProfile(
  token: string,
  payload: UpdateProfilePayload
): Promise<Profile> {
  try {
    const response = await client.patch<ProfileResponse>('/api/v1/auth/profile', payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to update profile');
    }

    return response.data.data;
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to update profile';
    throw new Error(message);
  }
}

/**
 * Logout — backend revokes session
 * Client clears JWT from secure store separately
 * @throws Error if API fails
 */
export async function logout(token: string): Promise<void> {
  try {
    const response = await client.post<{ success: boolean }>(
      '/api/v1/auth/logout',
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.data.success) {
      throw new Error('Failed to logout');
    }
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || 'Failed to logout';
    throw new Error(message);
  }
}
