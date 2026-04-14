import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';

/**
 * Shared axios client for all NearBy API calls.
 * Import this in every service module — never create a second axios instance.
 */
export const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});
