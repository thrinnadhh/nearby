export type UserRole = 'customer' | 'shop_owner' | 'delivery' | 'admin';

export interface User {
  userId: string;
  phone: string;
  role: UserRole;
  shopId?: string;
  name?: string;
  email?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export type KYCStatus = 'pending' | 'approved' | 'rejected';

export interface KYCSubmission {
  id: string;
  shop_id: string;
  shop_name: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  status: KYCStatus;
  submitted_at: string;
  updated_at: string;
  documents: {
    aadhaar: string;
    gst: string;
    shop_photo: string;
  };
  rejection_reason?: string;
}

export interface KYCQueueResponse {
  kyc_queue: KYCSubmission[];
  meta: PaginationMeta;
}

export interface Shop {
  id: string;
  name: string;
  category: string;
  phone: string;
  kyc_status: KYCStatus;
  is_open: boolean;
  trust_score: number;
  owner_name: string;
  owner_phone: string;
  created_at?: string;
  suspended_at?: string;
  suspension_reason?: string;
}

export interface ShopsResponse {
  shops: Shop[];
  meta: PaginationMeta;
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

export interface Order {
  id: string;
  customer_id: string;
  shop_id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at: string;
  pending_since?: string;
  customer_name?: string;
  shop_name?: string;
}

export interface OrdersResponse {
  orders: Order[];
  meta: PaginationMeta;
}

export type DisputeStatus = 'open' | 'resolved' | 'escalated';

export interface GPSPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Dispute {
  id: string;
  order_id: string;
  customer_phone?: string;
  shop_id?: string;
  shop_name?: string;
  customer_id: string;
  status: DisputeStatus;
  reason: string;
  created_at: string;
  updated_at?: string;
}

export interface DisputeDetail {
  id: string;
  customer_id?: string;
  customer_phone?: string;
  customer_name?: string;
  shop_id?: string;
  shop_name?: string;
  status?: DisputeStatus | string;
  reason?: string;
  created_at?: string;
  updated_at?: string;
  order_id: string;
  order_timeline: Array<{
    status: string;
    timestamp: string;
  }>;
  gps_trail: GPSPoint[];
}

export interface Analytics {
  gmv_total: number;
  orders_total: number;
  customers_total: number;
  shops_active: number;
  currency: string;
}

export interface DailyMetrics {
  date: string;
  daily_revenue: number;
  orders_count: number;
}

export interface CityBreakdown {
  city: string;
  gmv: number;
  orders: number;
}

export interface DailyAnalyticsResponse {
  daily: DailyMetrics[];
  by_city: CityBreakdown[];
  range: string;
  currency: string;
}

export interface TopShop {
  shop_id: string;
  shop_name: string;
  revenue: number;
  orders_count: number;
  avg_rating: number;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  status: string;
  rating: number;
  orders_completed: number;
  total_earnings: number;
  created_at: string;
  suspended_at?: string;
}

export interface DeliveryPartnersResponse {
  delivery_partners: DeliveryPartner[];
  meta: PaginationMeta;
}

export interface DeliveryPartnerEarning {
  date: string;
  orders: number;
  earnings: number;
  commission_paid: number;
}

export type ContentType = 'review' | 'product';

export interface ModerationItem {
  id: string;
  content_type: ContentType;
  creator_id: string;
  created_at: string;
  flag_count: number;
  reason: string;
  content?: string;
}

export interface ModerationQueueResponse {
  moderation_queue: ModerationItem[];
  meta: PaginationMeta;
}

export interface BroadcastCampaign {
  id: string;
  title: string;
  status?: string;
  body?: string;
  target: 'customers' | 'shops' | 'delivery';
  sent_count: number;
  created_at: string;
  scheduled_at?: string;
}

export interface BroadcastHistoryResponse {
  broadcasts: BroadcastCampaign[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  total: number;
  pages: number;
  limit: number;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}
