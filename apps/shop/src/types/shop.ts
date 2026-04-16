/**
 * Shop owner and shop profile types
 */

export type KYCStatus = 'pending' | 'approved' | 'rejected';

export type TrustBadge = 'Trusted' | 'Good' | 'New' | 'Review';

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  PACKING = 'packing',
  READY = 'ready',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Shop {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  isOpen: boolean;
  latitude: number;
  longitude: number;
  kycStatus: KYCStatus;
  trustScore: number;
  trustBadge: TrustBadge;
  completionRate: number;
  reviewCount: number;
  avgRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopProfile extends Shop {
  description?: string;
  categories: string[];
  operatingHours: {
    open: string;
    close: string;
  };
}

export interface TodayEarnings {
  ordersCount: number;
  totalEarnings: number; // in paise
  completedOrders: number;
  pendingOrders: number;
}

export interface WeeklyEarnings {
  [day: string]: number; // in paise
}

export interface EarningsData {
  today: TodayEarnings;
  weekly: WeeklyEarnings;
}
