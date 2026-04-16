/**
 * Order types for Shop Owner app
 */

import { OrderStatus } from './shop';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // in paise
  subtotal: number; // in paise
}

export interface Order {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  subtotal: number; // in paise
  deliveryFee: number; // in paise (25000 = ₹250)
  total: number; // in paise
  status: OrderStatus;
  paymentMode: 'upi' | 'cod';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  rejectionReason?: string;
  acceptanceDeadline: string; // ISO timestamp of when order expires if not accepted
}

export interface OrdersListResponse {
  success: boolean;
  data: Order[];
  meta: {
    page: number;
    total: number;
    pages: number;
  };
}

export interface OrderDetailResponse {
  success: boolean;
  data: Order;
}

export interface AcceptOrderPayload {
  status: 'accepted';
}

export interface RejectOrderPayload {
  status: 'rejected';
  reason: string;
}

export interface OrderActionResponse {
  success: boolean;
  data: {
    orderId: string;
    status: OrderStatus;
    updatedAt: string;
  };
}
