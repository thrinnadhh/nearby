import { client } from './api';
import type { GetShopReviewsParams, GetShopReviewsResponse } from '@/types';

/** GET /shops/:shopId/reviews — paginated review list */
export async function getShopReviews(
  shopId: string,
  params: GetShopReviewsParams,
  token?: string
): Promise<GetShopReviewsResponse> {
  const { data } = await client.get<{ success: boolean } & GetShopReviewsResponse>(
    `/shops/${shopId}/reviews`,
    {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  return { data: data.data, meta: data.meta };
}
