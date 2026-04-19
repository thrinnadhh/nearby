/**
 * Analytics types for Task 12.10
 */

export interface TopProduct {
  productId: string;
  productName: string;
  totalSales: number;
  totalRevenuePaise: number;
  avgRating: number;
}

export interface AnalyticsMetric {
  label: string;
  value: number;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
}

export interface AnalyticsPeriodData {
  views: number;
  orders: number;
  revenuePaise: number;
}

export interface AnalyticsData {
  today: AnalyticsPeriodData;
  week: AnalyticsPeriodData;
  month: AnalyticsPeriodData;
  topProducts: TopProduct[];
}

export type AnalyticsDateRange = '7d' | '30d' | '90d';

export interface AnalyticsState {
  data: AnalyticsData | null;
  topProducts: TopProduct[];
  loading: boolean;
  error: string | null;
  dateRange: AnalyticsDateRange;
  isOffline: boolean;
  lastUpdated: string | null;
}
