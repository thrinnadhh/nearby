/**
 * OrderDetailScreen test suite (Task 11.5)
 * Tests for order detail display, status timeline, and packing checklist navigation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import OrderDetailScreen from '../../../app/(tabs)/orders/[id]';
import { useOrders } from '@/hooks/useOrders';
import { useOrdersStore } from '@/store/orders';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Order, OrderStatus } from '@/types/orders';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/hooks/useOrders');
jest.mock('@/store/orders');
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@/components/order/OrderStatusTimeline', () => ({
  OrderStatusTimeline: () => <></>,
}));
jest.mock('@/components/order/CountdownTimer', () => ({
  CountdownTimer: () => <></>,
}));
jest.mock('@/components/order/OrderItemsPanel', () => ({
  OrderItemsPanel: () => <></>,
}));
jest.mock('@/components/order/CustomerInfoCard', () => ({
  CustomerInfoCard: () => <></>,
}));
jest.mock('@/components/common/OfflineBanner', () => ({
  OfflineBanner: () => <></>,
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
  status: 'pending' as OrderStatus,
  paymentMode: 'upi',
  paymentStatus: 'pending',
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  acceptanceDeadline: '2026-04-17T10:03:00Z',
};

describe('OrderDetailScreen - Task 11.5', () => {
  const mockRouter = {
    back: jest.fn(),
    push: jest.fn(),
  };

  const mockUseOrders = {
    fetchOrderDetail: jest.fn(),
    acceptCurrentOrder: jest.fn(),
    rejectCurrentOrder: jest.fn(),
    orders: [],
    loading: false,
    error: null,
    retry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'order-123' });
    (useOrders as jest.Mock).mockReturnValue(mockUseOrders);
    (useOrdersStore as jest.Mock).mockReturnValue({
      activeOrder: null,
      setActiveOrder: jest.fn(),
    });
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  });

  it('renders OrderDetailScreen with pending order', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Order #order-12/)).toBeDefined();
    });
  });

  it('displays order status timeline for pending orders', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Order Status')).toBeDefined();
    });
  });

  it('displays order total amount correctly', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/₹1,250/)).toBeDefined();
    });
  });

  it('shows accept and reject buttons for pending orders', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Accept Order')).toBeDefined();
      expect(screen.getByText('Reject Order')).toBeDefined();
    });
  });

  it('calls acceptCurrentOrder when accept button is pressed', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const acceptButton = screen.getByText('Accept Order');
      fireEvent.press(acceptButton);
    });

    expect(mockUseOrders.acceptCurrentOrder).toHaveBeenCalledWith('order-123');
  });

  it('shows packing checklist button for accepted orders', async () => {
    const acceptedOrder = { ...mockOrder, status: 'accepted' as OrderStatus };
    mockUseOrders.fetchOrderDetail.mockResolvedValue(acceptedOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText('Go to Packing Checklist')).toBeDefined();
    });
  });

  it('navigates to packing checklist on button press', async () => {
    const acceptedOrder = { ...mockOrder, status: 'accepted' as OrderStatus };
    mockUseOrders.fetchOrderDetail.mockResolvedValue(acceptedOrder);

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

  it('handles loading state correctly', () => {
    mockUseOrders.fetchOrderDetail.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByTestId } = render(<OrderDetailScreen />);
    expect(getByTestId('loading-spinner')).toBeDefined();
  });

  it('displays error when order fetch fails', async () => {
    mockUseOrders.fetchOrderDetail.mockRejectedValue(
      new Error('Failed to load order')
    );

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to Load Order/)).toBeDefined();
    });
  });

  it('displays offline banner when not online', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    const { getByTestId } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeDefined();
    });
  });

  it('displays reject modal when reject button is pressed', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject Order');
      fireEvent.press(rejectButton);
    });

    expect(screen.getByText('Why are you rejecting?')).toBeDefined();
  });

  it('validates rejection reason is not empty', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject Order');
      fireEvent.press(rejectButton);
    });

    const confirmButton = screen.getByText('Confirm Reject');
    expect(confirmButton.props.disabled).toBe(true);
  });

  it('displays delivered status when order is delivered', async () => {
    const deliveredOrder = {
      ...mockOrder,
      status: 'delivered' as OrderStatus,
    };
    mockUseOrders.fetchOrderDetail.mockResolvedValue(deliveredOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/been delivered/)).toBeDefined();
    });
  });

  it('hides accept/reject buttons after order is accepted', async () => {
    const acceptedOrder = { ...mockOrder, status: 'accepted' as OrderStatus };
    mockUseOrders.fetchOrderDetail.mockResolvedValue(acceptedOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.queryByText('Accept Order')).toBeNull();
      expect(screen.queryByText('Reject Order')).toBeNull();
    });
  });

  it('displays payment mode correctly', async () => {
    mockUseOrders.fetchOrderDetail.mockResolvedValue(mockOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Payment: UPI/)).toBeDefined();
    });
  });

  it('displays COD payment mode correctly', async () => {
    const codOrder = { ...mockOrder, paymentMode: 'cod' as const };
    mockUseOrders.fetchOrderDetail.mockResolvedValue(codOrder);

    render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Cash on Delivery/)).toBeDefined();
    });
  });
});
