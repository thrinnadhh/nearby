import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AnalyticsPage from '@/pages/AnalyticsPage';
import * as api from '@/services/api';

vi.mock('@/services/api');
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

// getAnalytics() uses getData() → returns Analytics type directly
const mockAnalyticsData = {
  gmv_total: 50000000,
  orders_total: 150,
  customers_total: 200,
  shops_active: 30,
  currency: 'INR',
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AnalyticsPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('AnalyticsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
    // Always mock supporting queries to prevent unhandled errors
    vi.spyOn(api.adminApi, 'getDailyAnalytics').mockResolvedValue({ daily: [] } as any);
    vi.spyOn(api.adminApi, 'getTopShops').mockResolvedValue([] as any);
  });

  it('renders analytics page title', async () => {
    vi.spyOn(api.adminApi, 'getAnalytics').mockResolvedValue(mockAnalyticsData as any);
    renderPage(queryClient);
    // Use getAllByText since sidebar has "Analytics" link AND page has "Platform Analytics"
    const matches = screen.getAllByText(/Analytics/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays summary metrics', async () => {
    vi.spyOn(api.adminApi, 'getAnalytics').mockResolvedValue(mockAnalyticsData as any);
    renderPage(queryClient);
    await waitFor(() => {
      // Component renders orders_total as "150"
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getAnalytics').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('handles analytics loading error', async () => {
    vi.spyOn(api.adminApi, 'getAnalytics').mockRejectedValue(
      new Error('Failed to load analytics'),
    );
    renderPage(queryClient);
    await waitFor(() => {
      // ErrorBoundary renders "Something went wrong" heading
      const matches = screen.getAllByText(/Something went wrong/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('displays metric cards', async () => {
    vi.spyOn(api.adminApi, 'getAnalytics').mockResolvedValue(mockAnalyticsData as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText('Total GMV')).toBeInTheDocument();
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('Total Customers')).toBeInTheDocument();
      expect(screen.getByText('Active Shops')).toBeInTheDocument();
    });
  });
});
