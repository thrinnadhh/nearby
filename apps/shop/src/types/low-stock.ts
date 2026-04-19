/**
 * Low Stock Alert types for Shop Owner app
 */

export interface LowStockProduct {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  category: string;
  price: number; // in paise
  stockQuantity: number;
  unit: string;
  isAvailable: boolean;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LowStockAlertsResponse {
  success: boolean;
  data: LowStockProduct[];
  meta: {
    page: number;
    total: number;
    pages: number;
    lowStockCount: number;
    threshold: number;
  };
}

export interface LowStockQueryParams {
  threshold?: number; // 1-999, default 5
  page?: number; // 1-indexed, default 1
  limit?: number; // 1-100, default 20
  sortBy?: 'stock' | 'name' | 'updated_at'; // default 'stock'
}

export interface LowStockDismissal {
  productId: string;
  dismissedAt: string;
  reason?: string;
}

export interface LowStockDismissalStore {
  [productId: string]: LowStockDismissal;
}
