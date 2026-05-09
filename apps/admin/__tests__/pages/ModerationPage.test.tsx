import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import ModerationPage from '@/pages/ModerationPage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockModerationResponse = {
  moderation_queue: [
    {
      id: 'mod-1',
      content_type: 'review',
      creator_id: 'user-1',
      flag_count: 3,
      reason: 'Inappropriate content',
      created_at: '2026-04-20T10:00:00Z',
      content: 'This content was flagged',
    },
    {
      id: 'mod-2',
      content_type: 'shop',
      creator_id: 'user-2',
      flag_count: 5,
      reason: 'Spam content',
      created_at: '2026-04-20T09:00:00Z',
    },
  ],
  meta: { page: 1, total: 2, pages: 1, limit: 20 },
};

const renderPage = (queryClient: QueryClient) =>
  render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ModerationPage />
      </QueryClientProvider>
    </BrowserRouter>,
  );

describe('ModerationPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
    vi.clearAllMocks();
  });

  it('renders moderation page title', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockResolvedValue(mockModerationResponse as any);
    renderPage(queryClient);
    // ModerationPage renders "Content Moderation" as title
    const matches = screen.getAllByText(/Moderation/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('displays items for moderation', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockResolvedValue(mockModerationResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      // Component renders "Reason: {item.reason}" so use regex partial match
      expect(screen.getByText(/Inappropriate content/)).toBeInTheDocument();
      expect(screen.getByText(/Spam content/)).toBeInTheDocument();
    });
  });

  it('displays flag counts', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockResolvedValue(mockModerationResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/3 flags/i)).toBeInTheDocument();
    });
  });

  it('displays content types', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockResolvedValue(mockModerationResponse as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getAllByText(/review|shop/i).length).toBeGreaterThan(0);
    });
  });

  it('displays empty state when no items', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockResolvedValue({
      moderation_queue: [],
      meta: { page: 1, total: 0, pages: 0, limit: 20 },
    } as any);
    renderPage(queryClient);
    await waitFor(() => {
      expect(screen.getByText(/No flagged content/i)).toBeInTheDocument();
    });
  });

  it('displays loading skeleton while loading', async () => {
    vi.spyOn(api.adminApi, 'getModerationQueue').mockImplementation(
      () => new Promise(() => {}),
    );
    renderPage(queryClient);
    await waitFor(() => {
      const elements = document.querySelectorAll('.animate-pulse');
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
