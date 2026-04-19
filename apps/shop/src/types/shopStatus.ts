/**
 * Holiday mode and shop status types
 */

import { AppError } from '@/types/common';

export interface HolidayMode {
  isOnHoliday: boolean;
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

export interface ShopStatus {
  isOpen: boolean;
  holidayMode: HolidayMode;
  lastStatusChange?: string; // ISO timestamp
}

export interface UpdateStatusRequest {
  isOpen?: boolean;
  holidayMode?: HolidayMode;
}

export interface UpdateStatusResponse {
  isOpen: boolean;
  holidayMode: {
    isOnHoliday: boolean;
    startDate?: string;
    endDate?: string;
  };
  lastStatusChange: string;
}
