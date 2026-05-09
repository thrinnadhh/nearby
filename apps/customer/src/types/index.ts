// ─── Domain types shared across the customer app ───────────────────────────

export type ShopCategory =
  | 'kirana'
  | 'vegetables'
  | 'pharmacy'
  | 'restaurant'
  | 'pet_store'
  | 'mobile'
  | 'furniture'
  | 'other';

export interface Shop {
  id: string;
  name: string;
  category: ShopCategory;
  address: string;
  /** straight-line distance in km from the user's location */
  distance: number;
  rating: number;
  trust_score: number;
  is_open: boolean;
  thumbnail_url: string | null;
  lat: number;
  lng: number;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  /** price in paise (integer). display as ₹(price / 100) */
  price: number;
  stock_qty: number;
  image_url: string | null;
  category: string;
  is_available: boolean;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'packing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  shop_id: string;
  shop_name: string;
  status: OrderStatus;
  /** total in paise */
  total_paise: number;
  items: OrderItem[];
  payment_method: 'upi' | 'cod';
  created_at: string;
  // Sprint 10 optional fields populated by order-detail / history endpoints
  updated_at?: string;
  delivery_address?: string;
  refund_status?: string | null;
  refund_amount?: number | null;
  delivery_partner?: {
    id: string;
    name?: string;
    phone?: string;
    rating?: number;
  } | null;
  /** Nested shop info returned by some endpoints */
  shop?: {
    id?: string;
    name?: string;
    is_open?: boolean;
  } | null;
  // Tracking fields (live ETA from delivery tracking endpoint)
  delivery_eta_seconds?: number | null;
  delivery_distance_km?: number | null;
  /** Some endpoints return status as order_status — both are accepted */
  order_status?: OrderStatus;
}

export interface Coords {
  lat: number;
  lng: number;
}

// ─── Shop detail (full profile screen) ──────────────────────────────────────

export interface ShopDetail {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_open: boolean;
  is_verified: boolean;
  trust_score: number;
  avg_rating: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  open_time: string | null;
  close_time: string | null;
  address: string | null;
  city: string | null;
  review_count: number;
}

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id: string | null;
}

export interface GetShopReviewsParams {
  limit?: number;
  sort?: 'recent' | 'rating';
  page?: number;
}

export interface GetShopReviewsResponse {
  data: Review[];
  meta: { total: number; page: number; pages: number };
}

export interface AddressSuggestion {
  id: string;
  address: string;
  lat: number;
  lng: number;
}
