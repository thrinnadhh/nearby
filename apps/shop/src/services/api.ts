/**
 * Shared axios client for all NearBy Shop API calls
 * Token interceptor automatically adds JWT to all requests
 * Import this in every service module — never create a second axios instance
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';
import logger from '@/utils/logger';

export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

/**
 * Request interceptor: Automatically attach JWT token to all requests
 * Read token from secure store and add to Authorization header
 */
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('nearby-jwt');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error('Failed to retrieve JWT from secure store', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle common error cases
 */
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        // Unauthorized — JWT likely expired
        // Store will handle logout via separate mechanism
        logger.warn('Received 401 — token may be expired');
      }
    }
    return Promise.reject(error);
  }
);
