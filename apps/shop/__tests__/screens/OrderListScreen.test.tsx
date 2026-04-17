/**
 * OrderListScreen test suite (Task 11.6)
 * Tests for order list display, filtering, pagination, and real-time updates
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import OrdersListScreen from '../../../app/(tabs)/orders/index';
import { useOrders } from '@/hooks/useOrders';
import { useOrderSocket } from '@/hooks/useOrderSocket';
import { useFCM } from '@/hooks/useFCM';
import { useOrdersStore } from '@/store/orders';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Order, OrderStatus } from '@/types/orders';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/hooks/useOrders');
jest.mock('@/hooks/useOrderSocket');
jest.mock('@/hooks/useFCM');
jest.mock('@/store/orders');
jest.mock('@/hooks/useNetworkStatus');
jest.mock('@react-navigation/native');
jest.mock('@/components/order/OrderCard', () => ({
  OrderCard: (props: any) => (
    <div data-testid={`order-card-${props.order.id}`}>{props.order.id}</div>
  ),
}));
jest.mock('@/components/common/OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner">Offline</div>,
}));

const mockOrders: Order[] = [
  {
    id: 'order-1',
    shopId: 'shop-1',
    customerId: 'cust-1',
    customerName: 'John',
    customerPhone: '9876543210',
    deliveryAddress: '123 Main St',
    items: [],
    subtotal: 100000,
    deliveryFee: 25000,
    total: 125000,
    status: 'pending' as OrderStatus,
    paymentMode: 'upi',
    createdAt: '2026-04-17T10:00:00Z',
    updatedAt: '2026-04-17T10:00:00Z',
    acceptanceDeadline: '2026-04-17T10:03:00Z',
  },
  {
    id: 'order-2',
    shopId: 'shop-1',
    customerId: 'cust-2',
    customerName: 'Jane',
    customerPhone: '9876543211',
    deliveryAddress: '456 Oak Ave',
    items: [],
    subtotal: 200000,
    deliveryFee: 25000,
    total: 225000,
    status: 'accepted' as OrderStatus,
    paymentMode: 'cod',
    createdAt: '2026-04-17T09:00:00Z',
    updatedAt: '2026-04-17T09:15:00Z',
    acceptanceDeadline: '2026-04-17T09:03:00Z',
    acceptedAt: '2026-04-17T09:15:00Z',
  },
  {
    id: 'order-3',
    shopId: 'shop-1',
    customerId: 'cust-3',
    customerName: 'Bob',
    customerPhone: '9876543212',
    deliveryAddress: '789 Pine St',
    items: [],
    subtotal: 150000,
    deliveryFee: 25000,
    total: 175000,
    status: 'packing' as OrderStatus,
    paymentMode: 'upi',
    createdAt: '2026-04-17T08:00:00Z',
    updatedAt: '2026-04-17T08:30:00Z',
    acceptanceDeadline: '2026-04-17T08:03:00Z',
    acceptedAt: '2026-04-17T08:05:00Z',
  },
];

describe('OrderListScreen - Task 11.6', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockUseOrders = {
    fetchOrders: jest.fn(),
    orders: mockOrders,
    loading: false,
    error: null,
    retry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useOrders as jest.Mock).mockReturnValue(mockUseOrders);
    (useOrderSocket as jest.Mock).mockReturnValue({
      onNewOrder: jest.fn(() => jest.fn()),
    });
    (useFCM as jest.Mock).mockReturnValue({
      registerFCMToken: jest.fn(),
    });
    (useOrdersStore as jest.Mock).mockReturnValue({
      addOrder: jest.fn(),
    });
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  });

  it('renders OrderListScreen with order list', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText(/Incoming Orders/)).toBeDefined();
    });
  });

  it('displays all orders in list when viewing all status', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('order-card-order-1')).toBeDefined();
      expect(screen.getByTestId('order-card-order-2')).toBeDefined();
      expect(screen.getByTestId('order-card-order-3')).toBeDefined();
    });
  });

  it('filters orders by pending status', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      const pendingTab = screen.getByText('Pending');
      fireEvent.press(pendingTab);
    });

    expect(mockUseOrders.fetchOrders).toHaveBeenCalledWith(
      1,
      'pending'
    );
  });

  it('filters orders by accepted status', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      const acceptedTab = screen.getByText('Accepted');
      fireEvent.press(acceptedTab);
    });

    expect(mockUseOrders.fetchOrders).toHaveBeenCalledWith(
      1,
      'accepted'
    );
  });

  it('filters orders by packing status', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      const packingTab = screen.getByText('Packing');
      fireEvent.press(packingTab);
    });

    expect(mockUseOrders.fetchOrders).toHaveBeenCalledWith(
      1,
      'packing'
    );
  });

  it('displays order count badge', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeDefined();
    });
  });

  it('navigates to order detail when order is tapped', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      const orderCard = screen.getByTestId('order-card-order-1');
      fireEvent.press(orderCard);
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '(tabs)/orders/[id]',
        params: { id: 'order-1' },
      })
    );
  });

  it('displays loading state when fetching orders', () => {
    (useOrders as jest.Mock).mockReturnValue({
      ...mockUseOrders,
      loading: true,
      orders: [],
    });

    const { getByTestId } = render(<OrdersListScreen />);
    expect(getByTestId('loading-spinner')).toBeDefined();
  });

  it('displays empty state when no orders exist', async () => {
    (useOrders as jest.Mock).mockReturnValue({
      ...mockUseOrders,
      orders: [],
    });

    render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText('No Pending Orders')).toBeDefined();
    });
  });

  it('displays error state when order fetch fails', async () => {
    (useOrders as jest.Mock).mockReturnValue({
      ...mockUseOrders,
      error: 'Failed to load orders',
      orders: [],
    });

    render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load Orders')).toBeDefined();
      expect(screen.getByText('Failed to load orders')).toBeDefined();
    });
  });

  it('retries loading orders on error', async () => {
    (useOrders as jest.Mock).mockReturnValue({
      ...mockUseOrders,
      error: 'Failed to load orders',
      orders: [],
      retry: jest.fn(),
    });

    render(<OrdersListScreen />);

    await waitFor(() => {
      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);
    });

    expect(mockUseOrders.retry).toHaveBeenCalled();
  });

  it('implements pull-to-refresh functionality', async () => {
    const { getByTestId } = render(<OrdersListScreen />);

    await waitFor(() => {
      expect(getByTestId('refresh-control')).toBeDefined();
    });
  });

  it('displays offline banner when not online', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });

    const { getByTestId } = render(<OrdersListScreen />);

    await waitFor(() => {
      expect(getByTestId('offline-banner')).toBeDefined();
    });
  });

  it('listens for new orders via Socket.IO', async () => {
    const mockOnNewOrder = jest.fn();
    (useOrderSocket as jest.Mock).mockReturnValue({
      onNewOrder: mockOnNewOrder,
    });

    render(<OrdersListScreen />);

    expect(mockOnNewOrder).toHaveBeenCalled();
  });

  it('registers FCM token on mount', async () => {
    const mockRegisterToken = jest.fn();
    (useFCM as jest.Mock).mockReturnValue({
      registerFCMToken: mockRegisterToken,
    });

    render(<OrdersListScreen />);

    expect(mockRegisterToken).toHaveBeenCalled();
  });

  it('displays filtered count when status filter is active', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      const pendingTab = screen.getByText('Pending');
      fireEvent.press(pendingTab);
    });

    // After filtering to pending, should show only 1 order count
    expect(screen.getByText('1')).toBeDefined();
  });

  it('updates order count when filter changes', async () => {
    const { rerender } = render(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeDefined();
    });

    // Change filter to accepted (1 order)
    const acceptedTab = screen.getByText('Accepted');
    fireEvent.press(acceptedTab);

    rerender(<OrdersListScreen />);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeDefined();
    });
  });

  it('fetches orders on initial load', () => {
    render(<OrdersListScreen />);

    expect(mockUseOrders.fetchOrders).toHaveBeenCalled();
  });

  it('displays orders from Zustand store', async () => {
    render(<OrdersListScreen />);

    await waitFor(() => {
      mockOrders.forEach((order) => {
        expect(screen.getByTestId(`order-card-${order.id}`)).toBeDefined();
      });
    });
  });
});
