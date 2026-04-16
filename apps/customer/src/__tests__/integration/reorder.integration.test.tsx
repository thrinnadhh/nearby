import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OrderHistoryScreen from '@/app/(tabs)/order-history';
import * as ordersService from '@/services/order-history';
import * as locationStore from '@/store/location';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { useRouter } from 'expo-router';

jest.mock('expo-router');
jest.mock('@/store/auth');
jest.mock('@/store/orders');
jest.mock('@/store/location');
jest.mock('@/services/order-history');

describe('Reorder Flow Integration', () => {
  const mockOrder = {
    id: 'order-123',
    shop_id: 'shop-456',
    shop_name: 'Test Shop',
    total_paise: 50000,
    order_status: 'delivered',
    items: [
      { product_id: 'prod-1', name: 'Item 1', price: 25000, qty: 1 },
      { product_id: 'prod-2', name: 'Item 2', price: 25000, qty: 1 },
    ],
    shop: { is_open: true, name: 'Test Shop' },
    created_at: '2026-04-16T10:00:00Z',
  };

  const mockRouter = { push: jest.fn() };
  const mockLocationStore = {
    deliveryAddress: '123 Main St',
    deliveryCoords: { lat: 12.9716, lng: 77.5946 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as jest.Mock).mockReturnValue({ token: 'test-token' });
    (useOrdersStore as jest.Mock).mockReturnValue({
      activeOrder: null,
      setActiveOrder: jest.fn(),
    });
    (locationStore.useLocationStore as jest.Mock).mockReturnValue(mockLocationStore);
  });

  it('displays reorder button for delivered orders', async () => {
    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText('Reorder')).toBeTruthy();
    });
  });

  it('disables reorder button when shop is closed', async () => {
    const closedShopOrder = {
      ...mockOrder,
      shop: { is_open: false, name: 'Test Shop' },
    };

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [closedShopOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      expect(getByText('Shop Closed')).toBeTruthy();
    });
  });

  it('requires delivery address for reorder', async () => {
    (locationStore.useLocationStore as jest.Mock).mockReturnValue({
      deliveryAddress: null,
      deliveryCoords: null,
    });

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      expect(getByText(/Delivery Address Required/)).toBeTruthy();
    });
  });

  it('calls reorderFromHistory with correct parameters', async () => {
    const mockReorderedOrder = { ...mockOrder, id: 'new-order-123' };
    (ordersService.reorderFromHistory as jest.Mock).mockResolvedValue(mockReorderedOrder);

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      expect(ordersService.reorderFromHistory).toHaveBeenCalledWith(
        'order-123',
        expect.objectContaining({
          address: '123 Main St',
          coordinates: { lat: 12.9716, lng: 77.5946 },
        }),
        'test-token'
      );
    });
  });

  it('shows success alert after reorder', async () => {
    const mockReorderedOrder = { ...mockOrder, id: 'new-order-123', order_id: 'order-789' };
    (ordersService.reorderFromHistory as jest.Mock).mockResolvedValue(mockReorderedOrder);

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      expect(getByText(/Order Created|successfully/i)).toBeTruthy();
    });
  });

  it('shows error alert on reorder failure', async () => {
    (ordersService.reorderFromHistory as jest.Mock).mockRejectedValue(
      new Error('Shop inventory updated')
    );

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      expect(getByText(/Reorder Failed|inventory/i)).toBeTruthy();
    });
  });

  it('navigates to order detail after reorder success', async () => {
    const mockReorderedOrder = { 
      ...mockOrder, 
      id: 'new-order-123',
      order_id: 'order-789'
    };
    (ordersService.reorderFromHistory as jest.Mock).mockResolvedValue(mockReorderedOrder);

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      // Check if router was called with order confirmed screen
      expect(mockRouter.push).toHaveBeenCalled();
    });
  });

  it('validates coordinates before reorder', async () => {
    (locationStore.useLocationStore as jest.Mock).mockReturnValue({
      deliveryAddress: '123 Main St',
      deliveryCoords: null, // Missing coordinates
    });

    (ordersService.getOrderHistory as jest.Mock).mockResolvedValue({
      data: [mockOrder],
      meta: { pages: 1, page: 1, total: 1 },
    });

    const { getByText } = render(<OrderHistoryScreen />);

    await waitFor(() => {
      const reorderButton = getByText('Reorder');
      fireEvent.press(reorderButton);
    });

    await waitFor(() => {
      expect(getByText(/coordinates|required/i)).toBeTruthy();
    });
  });
});
