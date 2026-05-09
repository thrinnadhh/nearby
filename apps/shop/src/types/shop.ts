/**
 * Shop owner and shop profile types
 */

export type KYCStatus = 'pending' | 'approved' | 'rejected';

export type TrustBadge = 'Trusted' | 'Good' | 'New' | 'Review';

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

/** Constant map for code that was using the old enum-style access (OrderStatus.PENDING) */
export const OrderStatus = {
  PENDING: 'pending' as const,
  ACCEPTED: 'accepted' as const,
  PACKING: 'packing' as const,
  READY: 'ready' as const,
  ASSIGNED: 'assigned' as const,
  PICKED_UP: 'picked_up' as const,
  OUT_FOR_DELIVERY: 'out_for_delivery' as const,
  DELIVERED: 'delivered' as const,
  CANCELLED: 'cancelled' as const,
};

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
