import axios from 'axios';
import { API_BASE_URL } from '@/constants/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for auth (JWT)
apiClient.interceptors.request.use((config) => {
  // JWT will be added by existing auth middleware
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Error handling
    if (error.response?.status === 401) {
      // Clear auth store and redirect to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
