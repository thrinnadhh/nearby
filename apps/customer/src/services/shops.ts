import { client } from './api';
import type { ShopDetail } from '@/types';

/** GET /shops/:id — fetch full shop profile */
export async function getShop(id: string, token?: string): Promise<ShopDetail> {
  const { data } = await client.get<{ success: boolean; data: ShopDetail }>(
    `/shops/${id}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );
  return data.data;
}
