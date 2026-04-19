/**
 * Delivery partner profile types
 */

export interface DeliveryPartner {
  id: string;
  userId: string;
  phone: string;
  aadhaarLast4?: string;
  vehiclePhotoUrl?: string;
  bankAccountName?: string;
  bankIFSC?: string;
  kycStatus: 'pending_kyc' | 'pending_review' | 'approved' | 'rejected';
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
  earningsToday: number;
  earningsTotal: number;
  rating: number; // 0-5
  completedDeliveries: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnlineStatusPayload {
  isOnline: boolean;
}

export interface OnlineStatusResponse {
  id: string;
  is_online: boolean;
  last_online_at: string | null;
}
