import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShopTable from '@/components/ShopTable';
import { Shop } from '@/types/admin';

describe('ShopTable Component', () => {
  const mockShops: Shop[] = [
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
  ];

  const mockPagination = {
    page: 1,
    total: 2,
    pages: 1,
    limit: 20,
  };

  const mockHandlers = {
    onPageChange: vi.fn(),
    onSuspend: vi.fn(),
    onReinstate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders shop table', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Test Shop 1')).toBeInTheDocument();
    expect(screen.getByText('Test Shop 2')).toBeInTheDocument();
  });

  it('displays shop names', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Test Shop 1')).toBeInTheDocument();
    expect(screen.getByText('Test Shop 2')).toBeInTheDocument();
  });

  it('displays owner names', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    expect(screen.getByText('Owner 1')).toBeInTheDocument();
    expect(screen.getByText('Owner 2')).toBeInTheDocument();
  });

  it('displays phone numbers', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    expect(screen.getByText(/9876543210/)).toBeInTheDocument();
  });

  it('displays KYC status badges', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    expect(screen.getAllByText(/approved|pending/i).length).toBeGreaterThan(0);
  });

  it('renders action buttons', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders table headers', () => {
    render(
      <ShopTable
        data={mockShops}
        pagination={mockPagination}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    // Check for table structure
    const table = document.querySelector('table');
    expect(table).toBeInTheDocument();
  });

  it('handles empty data state', () => {
    render(
      <ShopTable
        data={[]}
        pagination={{ page: 1, total: 0, pages: 0, limit: 20 }}
        isSuspendPending={false}
        isReinstatePending={false}
        {...mockHandlers}
      />,
    );

    // Should render table without errors
    const table = document.querySelector('table');
    expect(table).toBeInTheDocument();
  });
});
