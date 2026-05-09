import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import BroadcastPage from '@/pages/BroadcastPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const emptyBroadcastHistory = {
  broadcasts: [],
  meta: { page: 1, total: 0, pages: 0, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <BroadcastPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('BroadcastPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
    // BroadcastPage always calls getBroadcastHistory on mount
    vi.spyOn(api.adminApi, 'getBroadcastHistory').mockResolvedValue(emptyBroadcastHistory as any);
  });

  it('renders broadcast page title', async () => {
    renderPage(queryClient);
    // Use getAllByText since multiple "Broadcast" references exist in sidebar + heading
    const matches = screen.getAllByText(/Broadcast|Campaign/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays title input field', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Campaign title/i)).toBeInTheDocument();
    });
  });

  it('displays message textarea', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Campaign message/i)).toBeInTheDocument();
    });
  });

  it('displays recipient selection', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      // Target Audience select with Customers/Shops/Delivery options
      expect(screen.getByText(/Target Audience/i)).toBeInTheDocument();
    });
  });

  it('displays send button', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/Send Campaign/i)).toBeInTheDocument();
    });
  });

  it('handles message input', async () => {
    const user = userEvent.setup();
    renderPage(queryClient);
    const titleInput = await screen.findByPlaceholderText(/Campaign title/i);
    await user.type(titleInput, 'Test Title Here');
    expect(titleInput).toHaveValue('Test Title Here');
  });

  it('disables send when form is incomplete', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      const sendButton = screen.getByText(/Send Campaign/i);
      expect(sendButton).toBeDisabled();
    });
  });

  it('renders recipient options', async () => {
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
  });
});
