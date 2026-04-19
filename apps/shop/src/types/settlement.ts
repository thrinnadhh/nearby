/**
 * Settlement types and interfaces
 * Represents earnings withdrawals/settlements to shop bank accounts
 */

import { AppError } from '@/types/common';

export interface Settlement {
  id: string;
  shopId: string;
  amount: number; // in paise
  currency: string; // 'INR'
  status: 'pending' | 'initiated' | 'completed' | 'failed'; // settlement status
  utrNumber?: string; // Unique Transaction Reference (Cashfree)
  settlementDate?: string; // ISO date when settlement was processed
  initiatedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp when settlement succeeded
  failureReason?: string; // Reason if failed
  periodStartDate: string; // Start of settlement period (ISO date)
  periodEndDate: string; // End of settlement period (ISO date)
  netAmount: number; // Amount after fees/commission (paise)
  grossAmount: number; // Gross amount before deductions (paise)
  commission: number; // Commission deducted (paise)
  fees: number; // Other fees (paise)
}

export interface SettlementResponse {
  id: string;
  amount: number;
  status: 'pending' | 'initiated' | 'completed' | 'failed';
  utrNumber?: string;
  settlementDate?: string;
  initiatedAt: string;
  completedAt?: string;
  periodStartDate: string;
  periodEndDate: string;
  netAmount: number;
  grossAmount: number;
  commission: number;
  fees: number;
}

export interface SettlementListResponse {
  data: SettlementResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface SettlementState {
  data: SettlementResponse[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  pages: number;
  lastUpdated: string | null;
  isOffline: boolean;
}

export interface SettlementActions {
  setData: (data: SettlementResponse[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (page: number, limit: number, total: number) => void;
  setLastUpdated: (time: string | null) => void;
  setOffline: (isOffline: boolean) => void;
  reset: () => void;
}

export interface FetchSettlementsParams {
  page?: number;
  limit?: number;
}
