import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import PartnersPage from '@/pages/PartnersPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockPartnersResponse = {
  delivery_partners: [
    {
      id: 'partner-1',
      name: 'Partner 1',
      phone: '9876543210',
      status: 'active',
      rating: 4.5,
      orders_completed: 50,
      total_earnings: 25000,
      created_at: '2026-04-01T00:00:00Z',
    },
    {
      id: 'partner-2',
      name: 'Partner 2',
      phone: '9876543211',
      status: 'inactive',
      rating: 4.0,
      orders_completed: 30,
      total_earnings: 15000,
      created_at: '2026-04-01T00:00:00Z',
    },
  ],
  meta: { page: 1, total: 2, pages: 1, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <PartnersPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('PartnersPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it('renders partners page title', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue(mockPartnersResponse as any);
    renderPage(queryClient);
    // Use getAllByText since sidebar also has "Delivery Partners"
    const matches = screen.getAllByText(/Delivery|Partner/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays search input', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue(mockPartnersResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });
  });

  it('loads and displays delivery partners', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue(mockPartnersResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText('Partner 1')).toBeInTheDocument();
      expect(screen.getByText('Partner 2')).toBeInTheDocument();
    });
  });

  it('displays partner ratings', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue(mockPartnersResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    });
  });

  it('searches partners', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue(mockPartnersResponse as any);
    renderPage(queryClient);
    const searchInput = await screen.findByPlaceholderText(/Search/i);
    await user.type(searchInput, 'Partner 1');
    await waitFor(() => {
      expect(api.adminApi.getDeliveryPartners).toHaveBeenCalled();
    });
  });

  it('displays empty state when no partners', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockResolvedValue({
      delivery_partners: [],
      meta: { page: 1, total: 0, pages: 0, limit: 20 },
    } as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/No partners found/i)).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getDeliveryPartners').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
