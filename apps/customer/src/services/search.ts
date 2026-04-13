import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/constants/api';
import type { Shop, ShopCategory, Product } from '@/types';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
});

export interface SearchShopsParams {
  lat: number;
  lng: number;
  category?: ShopCategory;
  /** search radius in km — default 3, max 5 */
  radius?: number;
  page?: number;
  limit?: number;
}

export interface SearchShopsResponse {
  data: Shop[];
  meta: { total: number; page: number; pages: number };
}

// ─── Product search ──────────────────────────────────────────────────────────

export interface SearchProductsParams {
  q: string;
  /** user coords for geo-boosted ranking */
  lat?: number;
  lng?: number;
  /** filter by category */
  category?: string;
  /** filter by specific shop */
  shopId?: string;
  page?: number;
  limit?: number;
}

export interface SearchProductsResponse {
  data: (Product & { shop_name: string })[];
  meta: { total: number; page: number; pages: number };
}

/** GET /search/products — Typesense full-text product search */
export async function searchProducts(
  params: SearchProductsParams,
  token?: string
): Promise<SearchProductsResponse> {
  const { data } = await client.get<{ success: boolean } & SearchProductsResponse>(
    '/search/products',
    {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return { data: data.data, meta: data.meta };
}

// ─── Shop search ─────────────────────────────────────────────────────────────

/** GET /search/shops — Typesense geo-search proxied through our backend */
export async function searchNearbyShops(
  params: SearchShopsParams,
  token?: string
): Promise<SearchShopsResponse> {
  const { data } = await client.get<{ success: boolean } & SearchShopsResponse>(
    '/search/shops',
    {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return { data: data.data, meta: data.meta };
}
