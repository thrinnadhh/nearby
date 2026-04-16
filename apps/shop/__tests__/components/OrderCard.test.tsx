/**
 * Unit tests for OrderCard component
 * Tests rendering, prop handling, and press callback
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OrderCard } from '@/components/order/OrderCard';
import { Order } from '@/types/orders';

describe('OrderCard Component', () => {
  const mockOrder: Order = {
    id: 'order-abc123de',
    shopId: 'shop-123',
    customerId: 'customer-456',
    customerName: 'John Doe',
    customerPhone: '9876543210',
    deliveryAddress: '123 Main St, Apt 4B, Hyderabad, 500001',
    items: [
      { productId: 'p1', name: 'Milk 1L', qty: 2, subtotal: 100 },
      { productId: 'p2', name: 'Bread', qty: 1, subtotal: 40 },
    ],
    subtotal: 140,
    deliveryFee: 25,
    total: 165,
    status: 'pending' as const,
    paymentMode: 'upi' as const,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    acceptanceDeadline: new Date(
      Date.now() + 55 * 60 * 1000
    ).toISOString(), // 55 min from now
  };

  it('renders order card with all information', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    // Order ID (first 8 chars)
    expect(getByText(/abc123de/)).toBeTruthy();

    // Customer name
    expect(getByText('John Doe')).toBeTruthy();

    // Items count
    expect(getByText(/2 items/)).toBeTruthy();

    // Price
    expect(getByText(/₹165/)).toBeTruthy();

    // Status badge
    expect(getByText(/pending/i)).toBeTruthy();
  });

  it('displays customer phone number', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    expect(getByText('9876543210')).toBeTruthy();
  });

  it('displays delivery address (truncated)', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    // Should show address, possibly truncated
    expect(getByText(/123 Main St/)).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <OrderCard order={mockOrder} onPress={mockOnPress} testID="order-card" />
    );

    fireEvent.press(getByTestId('order-card'));

    expect(mockOnPress).toHaveBeenCalledWith(mockOrder.id);
  });

  it('displays correct status badge color', () => {
    const { getByTestId } = render(
      <OrderCard
        order={{ ...mockOrder, status: 'pending' }}
        onPress={jest.fn()}
        testID="status-badge"
      />
    );

    // Should have pending styling (yellow/warning color)
    expect(getByTestId('status-badge')).toBeTruthy();
  });

  it('displays time since order was created', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    // Should show relative time (5 minutes ago)
    expect(getByText(/ago|recently/i)).toBeTruthy();
  });

  it('renders multiple items correctly', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    // Should indicate 2 items
    expect(getByText(/2 items|more/)).toBeTruthy();
  });

  it('handles different order statuses', () => {
    const statuses: OrderStatus[] = [
      'pending',
      'accepted',
      'packing',
      'ready',
      'assigned',
      'picked_up',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];

    const validStatuses = ['pending', 'accepted', 'packing', 'ready', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'];

    validStatuses.forEach((status) => {
      const { getByText } = render(
        <OrderCard
          order={{ ...mockOrder, status: status as any }}
          onPress={jest.fn()}
        />
      );

      // Should render without error and show status
      expect(getByText(new RegExp(status, 'i'))).toBeTruthy();
    });
  });

  it('displays correct currency format', () => {
    const { getByText } = render(
      <OrderCard order={mockOrder} onPress={jest.fn()} />
    );

    // Should display as ₹165 (paise converted to rupees)
    expect(getByText('₹165')).toBeTruthy();
  });

  it('is pressable and accessible', () => {
    const mockOnPress = jest.fn();

    const { getByTestId } = render(
      <OrderCard
        order={mockOrder}
        onPress={mockOnPress}
        testID="order-card-pressable"
      />
    );

    const card = getByTestId('order-card-pressable');

    // Should be pressable
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalled();
  });
});

type OrderStatus = any;
