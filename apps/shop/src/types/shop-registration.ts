/**
 * Shop registration types for multi-screen onboarding flow
 */

export interface ShopRegistrationData {
  // Profile screen
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;

  // Photo screen
  photoUrl?: string;

  // KYC screen
  aadhaarUrl?: string;
  gstUrl?: string;
  bankUrl?: string;

  // Review screen
  confirmations?: {
    informationCorrect: boolean;
  };
}

export interface ShopKYC {
  aadhaarUrl: string;
  gstUrl: string;
  bankUrl: string;
  uploadedAt: string;
}

export interface KYCStatusResponse {
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface FileUploadResponse {
  url: string;
  signedUrl?: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ShopCreationPayload {
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface ShopCreationResponse {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export type ShopCategory =
  | 'kirana'
  | 'pharmacy'
  | 'restaurant'
  | 'flowers'
  | 'clothing'
  | 'electronics'
  | 'bakery'
  | 'meat'
  | 'vegetables'
  | 'mobile'
  | 'furniture'
  | 'stationery';

export const SHOP_CATEGORIES: Record<ShopCategory, string> = {
  kirana: 'Kirana Store',
  pharmacy: 'Pharmacy',
  restaurant: 'Restaurant',
  flowers: 'Flowers',
  clothing: 'Clothing',
  electronics: 'Electronics',
  bakery: 'Bakery',
  meat: 'Meat Shop',
  vegetables: 'Vegetables & Fruits',
  mobile: 'Mobile Shop',
  furniture: 'Furniture',
  stationery: 'Stationery',
};

export interface RegistrationScreenProps {
  shopId?: string;
}

export interface SignedUrl {
  url: string;
  expiresAt: number;
}
