import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';
import type { AddressSuggestion, Coords } from '@/types';

// Ola Maps reverse geocode is proxied through our backend to keep the API key
// server-side. The backend endpoint calls Ola Maps and returns a formatted address.
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export interface ReverseGeocodeResult {
  address: string;
  locality: string;
  city: string;
}

/**
 * Address autocomplete via backend proxy → Ola Maps Places API.
 * Returns empty array on any error (backend not yet live, network failure, etc.).
 */
export async function autocompleteAddress(
  q: string,
  token?: string
): Promise<AddressSuggestion[]> {
  if (!q.trim()) return [];
  try {
    const { data } = await client.get<{
      success: boolean;
      data: AddressSuggestion[];
    }>('/location/autocomplete', {
      params: { q },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Reverse geocode lat/lng → human-readable address via backend proxy.
 * Falls back to a coordinate string if the request fails.
 */
export async function reverseGeocode(
  coords: Coords,
  token?: string
): Promise<string> {
  try {
    const { data } = await client.get<{
      success: boolean;
      data: ReverseGeocodeResult;
    }>('/location/reverse-geocode', {
      params: { lat: coords.lat, lng: coords.lng },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data.data.address;
  } catch {
    // Graceful fallback — show raw coordinates until backend is reachable
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }
}
