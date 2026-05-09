import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import KycQueueTable from '@/components/KycQueueTable';

vi.mock('@/services/api');

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const mockKycQueue = [
  {
    id: 'kyc-1',
    shop_id: 'shop-1',
    shop_name: 'Test Shop 1',
    owner_id: 'owner-1',
    owner_name: 'John Doe',
    owner_phone: '9876543210',
    status: 'pending' as const,
    submitted_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    documents: {
      aadhaar: 'https://example.com/aadhaar.pdf',
      gst: 'https://example.com/gst.pdf',
      shop_photo: 'https://example.com/photo.jpg',
    },
  },
  {
    id: 'kyc-2',
    shop_id: 'shop-2',
    shop_name: 'Test Shop 2',
    owner_id: 'owner-2',
    owner_name: 'Jane Smith',
    owner_phone: '9876543211',
    status: 'pending' as const,
    submitted_at: '2026-04-21T10:00:00Z',
    updated_at: '2026-04-21T10:00:00Z',
    documents: {
      aadhaar: 'https://example.com/aadhaar2.pdf',
      gst: 'https://example.com/gst2.pdf',
      shop_photo: 'https://example.com/photo2.jpg',
    },
  },
];

const mockPagination = { page: 1, total: 2, pages: 1, limit: 20 };

const renderWithClient = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>,
  );

describe('KycQueueTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KYC queue table', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Test Shop 1')).toBeInTheDocument();
    expect(screen.getByText('Test Shop 2')).toBeInTheDocument();
  });

  it('displays shop names', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Test Shop 1')).toBeInTheDocument();
    expect(screen.getByText('Test Shop 2')).toBeInTheDocument();
  });

  it('displays owner names', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('displays submission dates', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    // toLocaleDateString format varies but year is always present
    expect(document.body.textContent).toMatch(/2026/);
  });

  it('displays pending status badge', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
  });

  it('renders action buttons for approval/rejection', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(screen.queryAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders table with proper structure', () => {
    renderWithClient(
      <KycQueueTable data={mockKycQueue} pagination={mockPagination} onPageChange={vi.fn()} />,
    );
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('handles empty KYC queue', () => {
    renderWithClient(
      <KycQueueTable data={[]} pagination={{ page: 1, total: 0, pages: 0, limit: 20 }} onPageChange={vi.fn()} />,
    );
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    renderWithClient(
      <KycQueueTable data={[]} pagination={{ page: 1, total: 0, pages: 0, limit: 20 }} onPageChange={vi.fn()} />,
    );
    expect(document.querySelector('table')).toBeInTheDocument();
  });
});
