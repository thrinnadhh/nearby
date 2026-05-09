import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ShopsPage from '@/pages/ShopsPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockShopsResponse = {
  shops: [
    {
      id: 'shop-1',
      name: 'Test Shop 1',
      category: 'Grocery',
      owner_name: 'Owner 1',
      owner_phone: '9876543210',
      phone: '9876543210',
      kyc_status: 'approved',
      is_open: true,
      trust_score: 4.5,
    },
    {
      id: 'shop-2',
      name: 'Test Shop 2',
      category: 'Electronics',
      owner_name: 'Owner 2',
      owner_phone: '9876543211',
      phone: '9876543211',
      kyc_status: 'pending',
      is_open: false,
      trust_score: 3.0,
    },
  ],
  meta: { page: 1, total: 2, pages: 1, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ShopsPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('ShopsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it('renders shops page title', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    // Use getAllByText since sidebar also has "Shop Management"
    const matches = screen.getAllByText(/Shop Management/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays search input', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by name or phone/i)).toBeInTheDocument();
    });
  });

  it('loads and displays shops', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText('Test Shop 1')).toBeInTheDocument();
      expect(screen.getByText('Test Shop 2')).toBeInTheDocument();
    });
  });

  it('searches shops by name', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    const searchInput = await screen.findByPlaceholderText(/Search by name or phone/i);
    await user.type(searchInput, 'Test Shop');
    await waitFor(() => {
      expect(api.adminApi.getShops).toHaveBeenCalledWith(1, 20, 'Test Shop', '');
    });
  });

  it('filters shops by KYC status', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    const approvedButton = await screen.findByText(/KYC approved/i);
    await user.click(approvedButton);
    await waitFor(() => {
      expect(api.adminApi.getShops).toHaveBeenCalledWith(1, 20, '', 'approved');
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('displays error boundary on error', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockRejectedValue(new Error('Failed to load'));
    renderPage(queryClient);
    await waitFor(() => {
      // ErrorBoundary renders "Something went wrong" heading
      const matches = screen.getAllByText(/Something went wrong|Failed/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  it('displays empty state when no shops found', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue({
      shops: [],
      meta: { page: 1, total: 0, pages: 0, limit: 20 },
    } as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/No shops found/i)).toBeInTheDocument();
    });
  });

  it('displays KYC status badges', async () => {
    vi.spyOn(api.adminApi, 'getShops').mockResolvedValue(mockShopsResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      const matches = screen.getAllByText(/approved|pending/i);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
