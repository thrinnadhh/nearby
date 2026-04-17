/**
 * Product types for Shop Owner app
 */

export interface ProductImage {
  id: string;
  productId: string;
  url: string; // R2 CDN URL
  isPrimary: boolean;
  uploadedAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description: string;
  category: string;
  price: number; // in paise (e.g., 50000 = ₹500)
  stockQty: number;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ProductsListResponse {
  success: boolean;
  data: Product[];
  meta: {
    page: number;
    total: number;
    pages: number;
  };
}

export interface ProductDetailResponse {
  success: boolean;
  data: Product;
}

export interface ProductQueryFilters {
  searchQuery: string;
  category: string; // 'all' or specific category name
}

export interface ProductWithStock extends Product {
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  stockThreshold: number; // default 5
}
