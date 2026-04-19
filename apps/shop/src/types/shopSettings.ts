/**
 * Shop settings types
 * Includes hours, delivery radius, bank details, description
 */

import { AppError } from '@/types/common';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface DayHours {
  day: DayOfWeek;
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  isClosed: boolean; // For closed days
}

export interface ShopSettings {
  hours: DayHours[];
  deliveryRadiusKm: number; // 1-10
  bankAccountNumber: string; // 9-18 digits
  bankIfsc: string; // 11 chars, uppercase
  bankAccountName: string; // Shop/owner name
  description: string; // 10-500 chars
}

export interface UpdateSettingsRequest {
  hours?: DayHours[];
  deliveryRadiusKm?: number;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankAccountName?: string;
  description?: string;
}

export interface UpdateSettingsResponse {
  hours: DayHours[];
  deliveryRadiusKm: number;
  bankAccountNumber: string;
  bankIfsc: string;
  bankAccountName: string;
  description: string;
  updatedAt: string;
}
