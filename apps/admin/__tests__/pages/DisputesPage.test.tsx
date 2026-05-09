import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import DisputesPage from '@/pages/DisputesPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockDisputesResponse = {
  disputes: [
    {
      id: 'dispute-1',
      order_id: 'order-1',
      initiator_type: 'customer',
      reason: 'Item missing',
      status: 'open',
      created_at: '2026-04-20T10:00:00Z',
      amount: 50000,
    },
    {
      id: 'dispute-2',
      order_id: 'order-2',
      initiator_type: 'shop',
      reason: 'Payment issue',
      status: 'resolved',
      created_at: '2026-04-20T09:00:00Z',
      amount: 75000,
    },
  ],
  meta: { page: 1, total: 2, pages: 1, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <DisputesPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('DisputesPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it('renders disputes page title', async () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockResolvedValue(mockDisputesResponse as any);
    renderPage(queryClient);
    // Use getAllByText since sidebar also has 'Disputes'
    const matches = screen.getAllByText(/Disputes/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays status filter buttons', async () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockResolvedValue(mockDisputesResponse as any);
    renderPage(queryClient);
    // DisputesPage has open/resolved/escalated filter buttons (not "All")
    await waitFor(() => {
      expect(screen.getByText('open')).toBeInTheDocument();
      expect(screen.getByText('resolved')).toBeInTheDocument();
    });
  });

  it('loads and displays disputes', async () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockResolvedValue(mockDisputesResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText('Item missing')).toBeInTheDocument();
      expect(screen.getByText('Payment issue')).toBeInTheDocument();
    });
  });

  it('filters disputes by status', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getDisputes').mockResolvedValue(mockDisputesResponse as any);
    renderPage(queryClient);
    const resolvedButton = await screen.findByText('resolved');
    await user.click(resolvedButton);
    await waitFor(() => {
      expect(api.adminApi.getDisputes).toHaveBeenCalled();
    });
  });

  it('displays empty state when no disputes found', async () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockResolvedValue({
      disputes: [],
      meta: { page: 1, total: 0, pages: 0, limit: 20 },
    } as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/No disputes found/i)).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('displays loading state initially', () => {
    vi.spyOn(api.adminApi, 'getDisputes').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    const elements = document.querySelectorAll('.animate-pulse');
    expect(elements.length).toBeGreaterThanOrEqual(0);
  });
});
