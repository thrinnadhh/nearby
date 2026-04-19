/**
 * Shared axios client for delivery partner API calls
 * Automatically adds JWT token to all requests from auth store
 */

import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';
import logger from '@/utils/logger';

// STEP 1: Create axios client instance FIRST
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// STEP 2: NOW we can set interceptors
client.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      logger.error('Failed to retrieve JWT from auth store', {
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
        logger.warn('Received 401 — token may be expired');
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export { client };
export default client;
