import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PaymentScreen from '@/app/(tabs)/payment/[orderId]';
import * as paymentsService from '@/services/payments';
import * as ordersService from '@/services/orders';
import { useOrdersStore } from '@/store/orders';
import * as router from 'expo-router';

vi.mock('@/services/payments');
vi.mock('@/services/orders');
vi.mock('@/store/orders');
vi.mock('expo-router');
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

describe('Payment Screen - Integration Tests', () => {
  const mockOrderId = 'order-123';
  const mockPaymentSession = {
    paymentSessionId: 'session-456',
    paymentLink: 'https://pay.cashfree.com/session-456',
    cashfreeOrderId: 'cforder-789',
  };

  const mockPaymentVerification = {
    status: 'SUCCESS',
    orderId: 'order-123',
    transactionId: 'txn-999',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock router hooks
    vi.mocked(router).useLocalSearchParams.mockReturnValue({ orderId: mockOrderId });
    vi.mocked(router).useRouter.mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    } as any);

    // Mock store
    vi.mocked(useOrdersStore).mockReturnValue({
      setActiveOrder: vi.fn(),
      activeOrder: { id: mockOrderId, total_amount: 50000 },
    } as any);
  });

  it('should render payment screen with loading state initially', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaymentSession), 100))
    );

    render(<PaymentScreen />);

    // Should show loading state first
    expect(screen.getByText(/initializing/i)).toBeDefined();
  });

  it('should initialize payment session on load', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalledWith(mockOrderId);
    });
  });

  it('should display payment session link after initialization', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      // Payment link should be loaded
      expect(screen.queryByText(/initializing/i)).toBeNull();
    });
  });

  it('should start polling when user taps proceed button', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);
    vi.mocked(paymentsService.pollPaymentStatus).mockResolvedValueOnce(mockPaymentVerification);

    render(<PaymentScreen />);

    await waitFor(() => {
      // Wait for initialization
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    // Tap "Proceed to payment" button
    const proceedButton = screen.getByText(/proceed to payment/i);
    fireEvent.press(proceedButton);

    await waitFor(() => {
      expect(paymentsService.pollPaymentStatus).toHaveBeenCalledWith(mockOrderId);
    });
  });

  it('should navigate to order-confirmed on successful payment', async () => {
    const mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    vi.mocked(router).useRouter.mockReturnValue(mockRouter as any);

    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);
    vi.mocked(paymentsService.pollPaymentStatus).mockResolvedValueOnce(mockPaymentVerification);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    const proceedButton = screen.getByText(/proceed to payment/i);
    fireEvent.press(proceedButton);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining('order-confirmed'));
    });
  });

  it('should set active order before navigation on success', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);
    vi.mocked(paymentsService.pollPaymentStatus).mockResolvedValueOnce(mockPaymentVerification);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    const proceedButton = screen.getByText(/proceed to payment/i);
    fireEvent.press(proceedButton);

    await waitFor(() => {
      const { setActiveOrder } = useOrdersStore();
      expect(setActiveOrder).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockOrderId })
      );
    });
  });

  it('should show error state if payment initialization fails', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
    });
  });

  it('should show retry button in error state', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockRejectedValueOnce(
      new Error('Failed to initialize')
    );

    render(<PaymentScreen />);

    await waitFor(() => {
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeDefined();
    });
  });

  it('should retry initialization when retry button tapped', async () => {
    vi.mocked(paymentsService.createPaymentSession)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/retry/i)).toBeDefined();
    });

    const retryButton = screen.getByText(/retry/i);
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalledTimes(2);
    });
  });

  it('should display order summary with amount', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/₹500\.00/i)).toBeDefined(); // ₹50000 paise = ₹500
    });
  });

  it('should display payment method information', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/upi/i)).toBeDefined();
      expect(screen.getByText(/card/i)).toBeDefined();
      expect(screen.getByText(/net banking/i)).toBeDefined();
    });
  });

  it('should display security badge', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/secure/i)).toBeDefined();
    });
  });

  it('should handle polling timeout gracefully', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);
    vi.mocked(paymentsService.pollPaymentStatus).mockRejectedValueOnce(
      new Error('Payment verification timeout')
    );

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    const proceedButton = screen.getByText(/proceed to payment/i);
    fireEvent.press(proceedButton);

    await waitFor(() => {
      expect(screen.getByText(/timeout/i)).toBeDefined();
    });
  });

  it('should allow user to cancel payment', async () => {
    const mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    vi.mocked(router).useRouter.mockReturnValue(mockRouter as any);

    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  it('should render close button in header', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    const mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    vi.mocked(router).useRouter.mockReturnValue(mockRouter as any);

    render(<PaymentScreen />);

    // Find close/back button - typically first button in header
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should handle payment service unexpected errors', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockRejectedValueOnce(
      new Error('Unexpected error from payment service')
    );

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeDefined();
    });
  });

  it('should display order ID for reference', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);

    render(<PaymentScreen />);

    await waitFor(() => {
      // Order ID should be visible somewhere (e.g., "Order #order-123")
      expect(screen.getByText(new RegExp(mockOrderId))).toBeDefined();
    });
  });

  it('should prevent multiple payment submissions', async () => {
    vi.mocked(paymentsService.createPaymentSession).mockResolvedValueOnce(mockPaymentSession);
    vi.mocked(paymentsService.pollPaymentStatus).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaymentVerification), 500))
    );

    render(<PaymentScreen />);

    await waitFor(() => {
      expect(paymentsService.createPaymentSession).toHaveBeenCalled();
    });

    const proceedButton = screen.getByText(/proceed to payment/i);
    
    // Try to click multiple times
    fireEvent.press(proceedButton);
    fireEvent.press(proceedButton);
    fireEvent.press(proceedButton);

    // Should only call polling once (or button should be disabled)
    await waitFor(() => {
      expect(paymentsService.pollPaymentStatus).toHaveBeenCalledTimes(1);
    });
  });
});
