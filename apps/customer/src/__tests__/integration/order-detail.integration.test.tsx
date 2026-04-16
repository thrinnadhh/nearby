import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OrderDetailScreen from '@/app/(tabs)/order-detail/[id]';
import * as ordersService from '@/services/orders';
import { useAuthStore } from '@/store/auth';
import { useOrdersStore } from '@/store/orders';
import { useLocalSearchParams } from 'expo-router';

jest.mock('expo-router');
jest.mock('@/store/auth');
jest.mock('@/store/orders');
jest.mock('@/services/orders');

describe('OrderDetailScreen Integration', () => {
  const mockOrder = {
    id: 'order-123',
    shop_id: 'shop-456',
    shop_name: 'Test Shop',
    status: 'delivered' as const,
    total_paise: 50000,
    items: [
      {
        product_id: 'prod-1',
        name: 'Test Product',
        price: 25000,
        qty: 2,
      },
    ],
    payment_method: 'upi' as const,
    created_at: '2026-04-16T10:00:00Z',
    delivery_address: '123 Main St, City',
    delivery_partner: {
      name: 'John Doe',
      rating: 4.8,
      deliveries_count: 125,
      vehicle: 'Bike',
      vehicle_number: 'KA-01-2345',
    },
    refund_status: 'completed',
    refund_amount: 50000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'order-123' });
    (useAuthStore as jest.Mock).mockReturnValue({ token: 'test-token' });
    (useOrdersStore as jest.Mock).mockReturnValue({
      activeOrder: null,
      setActiveOrder: jest.fn(),
    });
  });

  it('renders order header with order ID', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText(/Order #/)).toBeTruthy();
    });
  });

  it('displays total amount correctly', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('₹500.00')).toBeTruthy();
    });
  });

  it('shows delivery address', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('123 Main St, City')).toBeTruthy();
    });
  });

  it('displays delivery partner info when order is delivered', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText(/4\.8/)).toBeTruthy();
    });
  });

  it('shows timeline for order status', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByTestId } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByTestId('order-timeline')).toBeTruthy();
    });
  });

  it('displays items in order', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('Test Product')).toBeTruthy();
    });
  });

  it('shows refund badge when order is cancelled', async () => {
    const cancelledOrder = { ...mockOrder, status: 'cancelled' as const };
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(cancelledOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText(/Refund|refund/i)).toBeTruthy();
    });
  });

  it('enables reorder button for delivered orders', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('Reorder')).toBeTruthy();
    });
  });

  it('enables review button for delivered orders', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText('Write Review')).toBeTruthy();
    });
  });

  it('handles error gracefully', async () => {
    (ordersService.getOrderDetail as jest.Mock).mockRejectedValue(
      new Error('Failed to load order')
    );

    const { getByText } = render(<OrderDetailScreen />);

    await waitFor(() => {
      expect(getByText(/Unable to Load Order|Error/i)).toBeTruthy();
    });
  });

  it('shows loading state initially', () => {
    (ordersService.getOrderDetail as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByTestId } = render(<OrderDetailScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
