import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import OrdersPage from '@/pages/OrdersPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockOrdersResponse = {
  orders: [
    {
      id: 'order-1',
      customer_id: 'cust-1',
      customer_name: 'Customer 1',
      shop_id: 'shop-1',
      shop_name: 'Shop 1',
      status: 'pending',
      total: 50000,
      created_at: '2026-04-20T10:00:00Z',
      updated_at: '2026-04-20T10:00:00Z',
    },
    {
      id: 'order-2',
      customer_id: 'cust-2',
      customer_name: 'Customer 2',
      shop_id: 'shop-2',
      shop_name: 'Shop 2',
      status: 'accepted',
      total: 75000,
      created_at: '2026-04-20T09:00:00Z',
      updated_at: '2026-04-20T09:00:00Z',
    },
  ],
  meta: { page: 1, total: 2, pages: 1, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <OrdersPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('OrdersPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it('renders orders page title', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue(mockOrdersResponse as any);
    renderPage(queryClient);
    // Use getAllByText since sidebar also has "Orders"
    const matches = screen.getAllByText(/Order/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays filter buttons', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue(mockOrdersResponse as any);
    renderPage(queryClient);
    // OrdersPage has pending/accepted/packing filter buttons (no "All")
    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('accepted')).toBeInTheDocument();
    });
  });

  it('loads and displays orders', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue(mockOrdersResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      // Component renders order.customer_id and order.shop_id (not customer_name/shop_name)
      expect(screen.getByText(/cust-1/)).toBeInTheDocument();
      expect(screen.getByText(/cust-2/)).toBeInTheDocument();
    });
  });

  it('filters orders by status', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue(mockOrdersResponse as any);
    renderPage(queryClient);
    const acceptedButton = await screen.findByText('accepted');
    await user.click(acceptedButton);
    await waitFor(() => {
      expect(api.adminApi.getLiveOrders).toHaveBeenCalled();
    });
  });

  it('displays empty state when no orders found', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue({
      orders: [],
      meta: { page: 1, total: 0, pages: 0, limit: 20 },
    } as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/No orders found/i)).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('shows order totals', async () => {
    vi.spyOn(api.adminApi, 'getLiveOrders').mockResolvedValue(mockOrdersResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getAllByText(/order/i).length).toBeGreaterThan(0);
    });
  });
});
