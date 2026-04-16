import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OrderHistoryScreen from '@/app/(tabs)/order-history';
import * as ordersService from '@/services/order-history';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { useLocationStore } from '@/store/location';
import { useRouter } from 'expo-router';

jest.mock('expo-router');
jest.mock('@/store/auth');
jest.mock('@/store/orders');
jest.mock('@/store/location');
jest.mock('@/services/order-history');

describe('OrderHistory Integration Tests', () => {
  const mockOrders = [
    {
      id: 'order-1',
      shop_id: 'shop-1',
      shop_name: 'Shop A',
      order_status: 'delivered',
      total_amount: 50000,
      created_at: '2026-04-16T10:00:00Z',
      items: [{ name: 'Item 1', qty: 2 }],
    },
    {
      id: 'order-2',
      shop_id: 'shop-2',
      shop_name: 'Shop B',
      order_status: 'pending',
      total_amount: 30000,
      created_at: '2026-04-15T10:00:00Z',
      items: [{ name: 'Item 2', qty: 1 }],
    },
  ];

  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue({ token: 'test-token' });
    (useOrdersStore as jest.Mock).mockReturnValue({
      setActiveOrder: jest.fn(),
    });
    (useLocationStore as jest.Mock).mockReturnValue({
      deliveryAddress: '123 Main St',
      deliveryCoords: { lat: 12.9716, lng: 77.5946 },
    });
  });

  it('loads and displays order history', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: mockOrders,
      meta: { page: 1, pages: 1, total: 2 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText('Shop A')).toBeTruthy();
      expect(getByText('Shop B')).toBeTruthy();
    });
  });

  it('displays all available filter tabs', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: mockOrders,
      meta: { page: 1, pages: 1, total: 2 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText('All Orders')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Delivered')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });
  });

  it('filters orders by status', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrders[0]],
      meta: { page: 1, pages: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const deliveredFilter = getByText('Delivered');
      fireEvent.press(deliveredFilter);
    });

    await waitFor(() => {
      expect(ordersService.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.arrayContaining(['delivered']),
        }),
        'test-token'
      );
    });
  });

  it('supports infinite scroll pagination', async () => {
    const page1Orders = mockOrders.slice(0, 1);
    const page2Orders = mockOrders.slice(1);

    (ordersService.getOrderHistory as jest.Mock)
      .mockResolvedValueOnce({
        data: page1Orders,
        meta: { page: 1, pages: 2, total: 2 },
      })
      .mockResolvedValueOnce({
        data: page2Orders,
        meta: { page: 2, pages: 2, total: 2 },
      });

    const { getByText, getByTestId } = render(
      <OrderHistoryScreen testID="order-list" />
    );

    await waitFor(() => {
      expect(getByText('Shop A')).toBeTruthy();
    });

    // Simulate scroll to end
    const flatList = getByTestId('order-list');
    fireEvent.scroll(flatList, {
      nativeEvent: { contentOffset: { y: 1000 } },
    });

    await waitFor(() => {
      expect(ordersService.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
        'test-token'
      );
    });
  });

  it('navigates to order detail when order is tapped', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: mockOrders,
      meta: { page: 1, pages: 1, total: 2 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const order = getByText('Shop A');
      fireEvent.press(order);
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('order-detail')
      );
    });
  });

  it('supports pull-to-refresh', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: mockOrders,
      meta: { page: 1, pages: 1, total: 2 },
    });

    const { getByTestId } = render(
      <OrderHistoryScreen testID="refresh-control" />
    );

    await waitFor(() => {
      const refreshControl = getByTestId('refresh-control');
      fireEvent(refreshControl, 'refresh');
    });

    await waitFor(() => {
      expect(ordersService.getOrderHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('displays loading indicator on initial load', () => {
    (ordersService.getOrderHistory as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByTestId } = render(<OrderHistoryScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays error message on failed load', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText(/error|failed|Network/i)).toBeTruthy();
    });
  });

  it('shows empty state when no orders found', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [],
      meta: { page: 1, pages: 1, total: 0 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText(/no orders|empty/i)).toBeTruthy();
    });
  });

  it('uses correct sort order (newest first)', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: mockOrders,
      meta: { page: 1, pages: 1, total: 2 },
    });

    const { getByTestId } = render(
      <OrderHistoryScreen testID="order-list" />
    );

    await waitFor(() => {
      expect(ordersService.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
        'test-token'
      );
    });
  });
});
