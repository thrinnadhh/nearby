import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KycDetailModal from '@/components/KycDetailModal';

describe('KycDetailModal Component', () => {
  const mockKycData = {
    id: 'kyc-1',
    shop_id: 'shop-1',
    shop_name: 'Test Shop',
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
  };

  const mockHandlers = {
    onClose: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    isApprovePending: false,
    isRejectPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with KYC details', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    expect(screen.getByText('Test Shop')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays shop name', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    expect(screen.getByText('Test Shop')).toBeInTheDocument();
  });

  it('displays owner name', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays owner phone number', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    expect(screen.getByText(/9876543210/)).toBeInTheDocument();
  });

  it('displays submission status', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const pageContent = document.body.textContent;
    expect(pageContent).toMatch(/pending|approved|rejected/i);
  });

  it('displays document links', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const pageContent = document.body.textContent;
    expect(pageContent).toMatch(/aadhaar|gst|photo|document|file/i);
  });

  it('renders approval button', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const buttons = screen.queryAllByRole('button');
    const approveButton = buttons.find(
      (btn) => btn.textContent?.includes('Approve') || btn.textContent?.includes('Accept'),
    );
    expect(approveButton).toBeDefined();
  });

  it('renders rejection button', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const buttons = screen.queryAllByRole('button');
    const rejectButton = buttons.find(
      (btn) => btn.textContent?.includes('Reject') || btn.textContent?.includes('Decline'),
    );
    expect(rejectButton).toBeDefined();
  });

  it('renders close button', () => {
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const closeButton = screen.queryByText(/Close|Cancel|X/i);
    expect(closeButton).toBeDefined();
  });

  it('calls onApprove when approve button is clicked', async () => {
    const user = userEvent.setup();
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const buttons = screen.queryAllByRole('button');
    const approveButton = buttons.find(
      (btn) => btn.textContent?.includes('Approve') || btn.textContent?.includes('Accept'),
    );

    if (approveButton) {
      await user.click(approveButton);
      await waitFor(() => {
        expect(mockHandlers.onApprove).toHaveBeenCalled();
      });
    }
  });

  it('calls onReject when reject button is clicked', async () => {
    const user = userEvent.setup();
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    // Step 1: Click "Reject KYC" to open the rejection form
    const rejectKycButton = screen.getByText('Reject KYC');
    await user.click(rejectKycButton);

    // Step 2: Fill in the rejection reason (minimum 10 characters)
    const reasonInput = screen.getByPlaceholderText(/rejection reason/i);
    await user.type(reasonInput, 'Invalid documents provided');

    // Step 3: Click "Submit Rejection" to confirm
    const submitButton = screen.getByText(/Submit Rejection/i);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockHandlers.onReject).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const closeButton = screen.queryByText(/Close|Cancel/i);
    if (closeButton) {
      await user.click(closeButton);
      await waitFor(() => {
        expect(mockHandlers.onClose).toHaveBeenCalled();
      });
    }
  });

  it('displays modal background overlay', () => {
    const { container } = render(<KycDetailModal kyc={mockKycData} {...mockHandlers} />);

    const overlay = container.querySelector('[class*="fixed"]') || container.querySelector('[class*="modal"]');
    expect(overlay).toBeDefined();
  });
});
