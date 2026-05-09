import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import KycQueuePage from '@/pages/KycQueuePage';
import * as api from '@/services/api';

vi.mock('@/services/api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

beforeEach(() => {
  queryClient.clear();
});

const mockKycQueue = {
  kyc_queue: [
    {
      id: 'kyc-1',
      shop_id: 'shop-1',
      shop_name: 'Test Shop',
      owner_id: 'owner-1',
      owner_name: 'John Doe',
      owner_phone: '989XXXXXX10',
      status: 'pending' as const,
      submitted_at: '2026-04-20T10:00:00Z',
      updated_at: '2026-04-20T10:00:00Z',
      documents: {
        aadhaar: 'https://example.com/aadhaar.pdf',
        gst: 'https://example.com/gst.pdf',
        shop_photo: 'https://example.com/photo.jpg',
      },
    },
  ],
  meta: {
    page: 1,
    total: 1,
    pages: 1,
    limit: 20,
  },
};

describe('KycQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('renders KYC queue page', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    expect(screen.getByText(/KYC Review Queue/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
    });
  });

  it('displays filter buttons for status', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('rejected')).toBeInTheDocument();
  });

  it('filters by status when button clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    const approvedButton = screen.getByText('approved');
    await user.click(approvedButton);

    await waitFor(() => {
      expect(api.adminApi.getKycQueue).toHaveBeenCalledWith(
        1,
        20,
        'approved',
      );
    });
  });

  it('displays shop and owner information', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('989XXXXXX10')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton initially', () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    const skeletons = screen.queryAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('handles error gracefully', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockRejectedValue(
      new Error('API Error'),
    );

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no results', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue({ kyc_queue: [], meta: { page: 1, total: 0, pages: 0, limit: 20 } } as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/No KYC submissions found/i)).toBeInTheDocument();
    });
  });

  it('displays pagination controls', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    });
  });

  it('displays action buttons for pending KYC', async () => {
    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(mockKycQueue as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/View/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Approve/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Reject/i).length).toBeGreaterThan(0);
    });
  });

  it('hides action buttons for approved KYC', async () => {
    const approvedKyc = {
      ...mockKycQueue,
      kyc_queue: [
        {
          ...mockKycQueue.kyc_queue[0],
          status: 'approved' as const,
        },
      ],
    };

    vi.spyOn(api.adminApi, 'getKycQueue').mockResolvedValue(approvedKyc as any);

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <KycQueuePage />
        </QueryClientProvider>
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/View/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/^Approve$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Reject$/)).not.toBeInTheDocument();
    });
  });
});
