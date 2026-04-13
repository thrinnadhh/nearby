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
}

export interface Coords {
  lat: number;
  lng: number;
}
