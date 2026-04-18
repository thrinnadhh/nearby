/**
 * OrderDetailScreen test suite (Task 11.7)
 * Tests for order detail display, status timeline, accept/reject, and navigation
 */

import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import OrderDetailScreen from '../../../app/(tabs)/orders/[id]';
import { useOrders } from '@/hooks/useOrders';
import { useOrdersStore } from '@/store/orders';
import { Order } from '@/types/orders';
import { OrderStatus } from '@/types/shop';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/hooks/useOrders');
jest.mock('@/store/orders');
jest.mock('@/components/order/OrderStatusTimeline', () => ({
  OrderStatusTimeline: () => null,
}));
jest.mock('@/components/order/CountdownTimer', () => ({
  CountdownTimer: () => null,
}));
jest.mock('@/components/order/OrderItemsPanel', () => ({
  OrderItemsPanel: () => null,
}));
jest.mock('@/components/order/CustomerInfoCard', () => ({
  CustomerInfoCard: () => null,
}));
jest.mock('@/components/common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/utils/formatters', () => ({
  formatCurrency: (amount: number) => `₹${(amount / 100).toFixed(0)}`,
  formatDateTime: (ts: string) => ts,
}));
jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockOrder: Order = {
  id: 'order-123',
  shopId: 'shop-1',
  customerId: 'customer-1',
  customerName: 'John Doe',
  customerPhone: '9876543210',
  deliveryAddress: '123 Main St, City',
  items: [
    {
      productId: 'prod-1',
      productName: 'Tea',
      quantity: 2,
      price: 50000,
      subtotal: 100000,
    },
  ],
  subtotal: 100000,
  deliveryFee: 25000,
  total: 125000,
  status: OrderStatus.PENDING,
  paymentMode: 'upi',
  paymentStatus: 'pending',
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  acceptanceDeadline: '2026-04-17T10:03:00Z',
};

describe('OrderDetailScreen - Task 11.7', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
  };

  const mockFetchOrderDetail = jest.fn();
  const mockAcceptCurrentOrder = jest.fn();
  const mockRejectCurrentOrder = jest.fn();
  const mockSetActiveOrder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'order-123' });
    (useOrders as jest.Mock).mockReturnValue({
      fetchOrderDetail: mockFetchOrderDetail,
      acceptCurrentOrder: mockAcceptCurrentOrder,
      rejectCurrentOrder: mockRejectCurrentOrder,
      orders: [],
      loading: false,
      error: null,
      retry: jest.fn(),
    });
    (useOrdersStore as jest.Mock).mockReturnValue({
      activeOrder: null,
      setActiveOrder: mockSetActiveOrder,
    });
  });

  it('renders OrderDetailScreen with pending order', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Order #order-12/)).toBeDefined();
    });
  });

  it('shows Order Status section', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Order Status')).toBeDefined();
    });
  });

  it('shows accept and reject buttons for pending orders', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Accept Order')).toBeDefined();
      expect(screen.getByText('Reject Order')).toBeDefined();
    });
  });

  it('calls acceptCurrentOrder when accept button is pressed', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);
    mockAcceptCurrentOrder.mockResolvedValue(undefined);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const acceptButton = screen.getByText('Accept Order');
      fireEvent.press(acceptButton);
    });

    await waitFor(() => {
      expect(mockAcceptCurrentOrder).toHaveBeenCalledWith('order-123');
    });
  });

  it('shows packing checklist button for accepted orders', async () => {
    const acceptedOrder: Order = { ...mockOrder, status: OrderStatus.ACCEPTED };
    mockFetchOrderDetail.mockResolvedValue(acceptedOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Go to Packing Checklist')).toBeDefined();
    });
  });

  it('navigates to packing checklist on button press', async () => {
    const acceptedOrder: Order = { ...mockOrder, status: OrderStatus.ACCEPTED };
    mockFetchOrderDetail.mockResolvedValue(acceptedOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const checklistButton = screen.getByText('Go to Packing Checklist');
      fireEvent.press(checklistButton);
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(tabs)/index',
        params: expect.objectContaining({
          orderId: 'order-123',
          openChecklist: 'true',
        }),
      })
    );
  });

  it('shows loading spinner while fetching', () => {
    mockFetchOrderDetail.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(<OrderDetailScreen />);
    expect(getByTestId('loading-spinner')).toBeDefined();
  });

  it('displays error when order fetch fails', async () => {
    mockFetchOrderDetail.mockRejectedValue(
      new Error('Failed to load order')
    );

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to Load Order/)).toBeDefined();
    });
  });

  it('displays reject modal when reject button is pressed', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject Order');
      fireEvent.press(rejectButton);
    });

    expect(screen.getByText('Why are you rejecting?')).toBeDefined();
  });

  it('validates rejection reason is not empty (Confirm Reject disabled)', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject Order');
      fireEvent.press(rejectButton);
    });

    const confirmButton = screen.getByText('Confirm Reject');
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('calls rejectCurrentOrder with reason when confirmed', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);
    mockRejectCurrentOrder.mockResolvedValue(undefined);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      fireEvent.press(screen.getByText('Reject Order'));
    });

    const input = screen.getByPlaceholderText('Please provide a reason...');
    fireEvent.changeText(input, 'Out of stock');

    await waitFor(() => {
      const confirmButton = screen.getByText('Confirm Reject');
      expect(confirmButton.props.disabled).toBe(false);
      fireEvent.press(confirmButton);
    });

    await waitFor(() => {
      expect(mockRejectCurrentOrder).toHaveBeenCalledWith(
        'order-123',
        'Out of stock'
      );
    });
  });

  it('hides accept/reject buttons after order is accepted', async () => {
    const acceptedOrder: Order = { ...mockOrder, status: OrderStatus.ACCEPTED };
    mockFetchOrderDetail.mockResolvedValue(acceptedOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.queryByText('Accept Order')).toBeNull();
      expect(screen.queryByText('Reject Order')).toBeNull();
    });
  });

  it('displays payment mode as UPI', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Payment: UPI/)).toBeDefined();
    });
  });

  it('displays COD payment mode correctly', async () => {
    const codOrder: Order = { ...mockOrder, paymentMode: 'cod' };
    mockFetchOrderDetail.mockResolvedValue(codOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Cash on Delivery/)).toBeDefined();
    });
  });

  it('shows status text for delivered orders', async () => {
    const deliveredOrder: Order = {
      ...mockOrder,
      status: OrderStatus.DELIVERED,
    };
    mockFetchOrderDetail.mockResolvedValue(deliveredOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/been delivered/)).toBeDefined();
    });
  });

  it('sets active order in store after loading', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(mockSetActiveOrder).toHaveBeenCalledWith(mockOrder);
    });
  });

  it('shows total amount in formatted currency', async () => {
    mockFetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      // 125000 paise = ₹1250
      expect(screen.getByText(/₹1250/)).toBeDefined();
    });
  });
});
