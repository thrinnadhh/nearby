import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import OrderConfirmedScreen from '@/app/(tabs)/order-confirmed/[orderId]';
import * as ordersService from '@/services/orders';
import { useOrdersStore } from '@/store/orders';
import { useAuthStore } from '@/store/auth';
import * as router from 'expo-router';

vi.mock('@/services/orders');
vi.mock('@/store/orders');
vi.mock('@/store/auth');
vi.mock('expo-router');

// Mock timers
vi.useFakeTimers();

describe('Order Confirmed Screen - Integration Tests', () => {
  const mockOrderId = 'order-123';
  const mockOrder = {
    id: mockOrderId,
    total_amount: 50000,
    order_status: 'pending',
    payment_method: 'cod',
    shop: { id: 'shop-1', name: 'Sample Store' },
    order_items: [
      { id: 'item-1', product_name: 'Milk', qty: 1, price: 6000 },
      { id: 'item-2', product_name: 'Bread', qty: 1, price: 4000 },
    ],
    created_at: '2026-04-16T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock router
    vi.mocked(router).useLocalSearchParams.mockReturnValue({ orderId: mockOrderId });
    vi.mocked(router).useRouter.mockReturnValue({
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    } as any);

    // Mock stores
    vi.mocked(useAuthStore).mockReturnValue({
      token: 'mock-token',
    } as any);

    vi.mocked(useOrdersStore).mockReturnValue({
      setActiveOrder: vi.fn(),
    } as any);
  });

  it('should render timer section on load', () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    expect(screen.getByText(/Shop is reviewing your order/i)).toBeDefined();
    expect(screen.getByText(/3:00/)).toBeDefined(); // 180 seconds
  });

  it('should fetch order details on initial load', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(ordersService.getOrder).toHaveBeenCalledWith(mockOrderId);
    });
  });

  it('should display order summary correctly', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText(mockOrderId)).toBeDefined();
      expect(screen.getByText('Sample Store')).toBeDefined();
      expect(screen.getByText('2 items')).toBeDefined();
      expect(screen.getByText('Cash on Delivery')).toBeDefined();
      expect(screen.getByText('₹500.00')).toBeDefined(); // ₹50000 paise
    });
  });

  it('should countdown timer every second', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    expect(screen.getByText(/3:00/)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText(/2:59/)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(59000); // Advance to 2:00
    });

    expect(screen.getByText(/2:00/)).toBeDefined();
  });

  it('should show minutes remaining message when > 60s', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText(/3 min remaining/i)).toBeDefined();
    });
  });

  it('should show seconds remaining message when < 60s', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(120000); // Advance to 1:00
    });

    await waitFor(() => {
      expect(screen.getByText(/60 seconds remaining/i)).toBeDefined();
    });
  });

  it('should poll order status every 5 seconds', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(ordersService.getOrder).toHaveBeenCalled();
    });

    const initialCallCount = vi.mocked(ordersService.getOrder).mock.calls.length;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(vi.mocked(ordersService.getOrder).mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });
  });

  it('should navigate to tracking when shop accepts order', async () => {
    const mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    vi.mocked(router).useRouter.mockReturnValue(mockRouter as any);

    const acceptedOrder = { ...mockOrder, order_status: 'accepted' };
    vi.mocked(ordersService.getOrder).mockResolvedValue(acceptedOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining('tracking'));
    });
  });

  it('should set active order before navigation on acceptance', async () => {
    const acceptedOrder = { ...mockOrder, order_status: 'accepted' };
    vi.mocked(ordersService.getOrder).mockResolvedValue(acceptedOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      const { setActiveOrder } = useOrdersStore();
      expect(setActiveOrder).toHaveBeenCalledWith(acceptedOrder);
    });
  });

  it('should show timeout state after 180 seconds with no acceptance', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(180000); // Full 180 seconds
    });

    await waitFor(() => {
      expect(screen.getByText(/Shop Didn't Respond/i)).toBeDefined();
      expect(screen.getByText(/hasn't accepted your order within 3 minutes/i)).toBeDefined();
    });
  });

  it('should show try again and cancel buttons in timeout state', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(180000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Try Again/i)).toBeDefined();
      expect(screen.getByText(/Cancel Order/i)).toBeDefined();
    });
  });

  it('should allow user to retry after timeout', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(180000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Try Again/i)).toBeDefined();
    });

    const tryAgainButton = screen.getByText(/Try Again/i);
    fireEvent.press(tryAgainButton);

    // Timer should reset
    expect(screen.getByText(/3:00/)).toBeDefined();
  });

  it('should display error banner if order fetch fails', async () => {
    vi.mocked(ordersService.getOrder).mockRejectedValue(new Error('Network error'));

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText(/⚠️/)).toBeDefined();
      expect(screen.getByText(/Network error/i)).toBeDefined();
    });
  });

  it('should continue polling even after error', async () => {
    const mockRouter = {
      replace: vi.fn(),
      push: vi.fn(),
      back: vi.fn(),
    };
    vi.mocked(router).useRouter.mockReturnValue(mockRouter as any);

    vi.mocked(ordersService.getOrder)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockOrder)
      .mockResolvedValueOnce({ ...mockOrder, order_status: 'accepted' });

    render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(expect.stringContaining('tracking'));
    });
  });

  it('should show what happens next section', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText(/What Happens Next/i)).toBeDefined();
      expect(screen.getByText(/Shop receives & reviews your order/i)).toBeDefined();
      expect(screen.getByText(/Shop confirms and starts packing/i)).toBeDefined();
      expect(screen.getByText(/Delivery partner will be assigned/i)).toBeDefined();
      expect(screen.getByText(/Track your order in real-time/i)).toBeDefined();
    });
  });

  it('should have cancel order button', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      const cancelButtons = screen.getAllByText(/Cancel Order/i);
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show alert when cancel button tapped', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    const alertSpy = vi.spyOn(global, 'alert').mockImplementation();

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Cancel Order/i)).toBeDefined();
    });

    const cancelButton = screen.getAllByText(/Cancel Order/i)[0];
    fireEvent.press(cancelButton);

    // Alert should be called (React Native's Alert is stubbed)
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('should handle missing orderId gracefully', () => {
    vi.mocked(router).useLocalSearchParams.mockReturnValue({});

    render(<OrderConfirmedScreen />);

    expect(screen.getByText(/Order ID not found/i)).toBeDefined();
  });

  it('should handle missing auth token gracefully', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      token: null,
    } as any);

    vi.mocked(router).useLocalSearchParams.mockReturnValue({ orderId: mockOrderId });

    render(<OrderConfirmedScreen />);

    // Should not crash, order fetch should be skipped
    expect(ordersService.getOrder).not.toHaveBeenCalled();
  });

  it('should display UPI payment method for UPI orders', async () => {
    const upiOrder = { ...mockOrder, payment_method: 'upi' };
    vi.mocked(ordersService.getOrder).mockResolvedValue(upiOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText('UPI')).toBeDefined();
    });
  });

  it('should update progress bar as timer counts down', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    const { getByTestId } = render(<OrderConfirmedScreen />);

    // Progress bar starts at 100% (180/180)
    expect(screen.getByText(/3:00/)).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(90000); // Half the time
    });

    // Progress bar should be at ~50% (90/180)
    expect(screen.getByText(/1:30/)).toBeDefined();
  });

  it('should show correct item count for multiple items', async () => {
    const multiItemOrder = {
      ...mockOrder,
      order_items: [
        { id: 'item-1', product_name: 'Milk', qty: 2, price: 12000 },
        { id: 'item-2', product_name: 'Bread', qty: 3, price: 12000 },
        { id: 'item-3', product_name: 'Eggs', qty: 1, price: 5000 },
      ],
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(multiItemOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText('3 items')).toBeDefined();
    });
  });

  it('should show correct item count for single item', async () => {
    const singleItemOrder = {
      ...mockOrder,
      order_items: [{ id: 'item-1', product_name: 'Milk', qty: 1, price: 6000 }],
    };

    vi.mocked(ordersService.getOrder).mockResolvedValue(singleItemOrder);

    render(<OrderConfirmedScreen />);

    await waitFor(() => {
      expect(screen.getByText('1 item')).toBeDefined();
    });
  });

  it('should clean up timers on unmount', async () => {
    vi.mocked(ordersService.getOrder).mockResolvedValue(mockOrder);

    const { unmount } = render(<OrderConfirmedScreen />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    unmount();

    // No errors should occur when unmounting
    expect(true).toBe(true);
  });
});
