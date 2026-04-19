/**
 * Earnings and analytics types
 */

export interface AnalyticsRecord {
  date: string;
  netRevenuePaise: number;
  grossRevenuePaise: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;
  avgAcceptanceTimeSeconds: number | null;
  avgPreparationTimeSeconds: number | null;
  reviewCount: number;
  avgRating: number | null;
  uniqueCustomers: number;
}

export interface EarningsSummary {
  today_total: number;
  week_total: number;
  month_total: number;
  previous_day_total: number;
  previous_week_total: number;
  previous_month_total: number;
}

export interface EarningsData {
  today: AnalyticsRecord | null;
  week: AnalyticsRecord[];
  month: AnalyticsRecord[];
  summary: EarningsSummary;
}

export type DateRange = '7d' | '30d' | '90d';

export interface EarningsState {
  data: EarningsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  dateRange: DateRange;
  isOffline: boolean;
}

export interface EarningsMetric {
  label: string;
  value: number; // in paise
  trend: 'up' | 'down' | 'neutral';
  trendPercent: number;
}
