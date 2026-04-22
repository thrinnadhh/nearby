/**
 * Unit tests for OrderPreviewCard component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OrderPreviewCard } from '@/components/OrderPreviewCard';
import { OrderForDelivery } from '@/types/assignment';

describe('OrderPreviewCard', () => {
  const mockOnAccept = jest.fn();
  const mockOnReject = jest.fn();

  const mockOrder: OrderForDelivery = {
    id: 'order-123',
    customerId: 'cust-123',
    shopId: 'shop-123',
    shopName: 'Test Shop',
    totalAmount: 50000,
    status: 'assigned',
    customerPhone: '9876543210',
    deliveryAddress: '123 Main St, City',
    deliveryLat: 17.36,
    deliveryLng: 78.47,
    pickupLat: 17.35,
    pickupLng: 78.46,
    items: [
      {
        id: 'item-1',
        productName: 'Product 1',
        quantity: 2,
        price: 20000,
      },
      {
        id: 'item-2',
        productName: 'Product 2',
        quantity: 1,
        price: 10000,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render order preview card', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Test Shop')).toBeTruthy();
    expect(screen.getByText('2.50 km')).toBeTruthy();
    expect(screen.getByText(/Customer Phone/)).toBeTruthy();
  });

  it('should display item count badge', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('3 items')).toBeTruthy();
  });

  it('should display formatted currency', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('₹500.00')).toBeTruthy();
  });

  it('should display estimated times', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();
    expect(screen.getByText('25 min')).toBeTruthy();
  });

  it('should display all order items', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Product 1')).toBeTruthy();
    expect(screen.getByText('Product 2')).toBeTruthy();
    expect(screen.getByText('Qty: 2')).toBeTruthy();
    expect(screen.getByText('Qty: 1')).toBeTruthy();
  });

  it('should display customer phone', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('9876543210')).toBeTruthy();
  });

  it('should display delivery address', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('123 Main St, City')).toBeTruthy();
  });

  it('should call onAccept when accept button is pressed', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const acceptButton = screen.getByText('Accept');
    fireEvent.press(acceptButton);

    expect(mockOnAccept).toHaveBeenCalled();
  });

  it('should call onReject when reject button is pressed', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    const rejectButton = screen.getByText('Reject');
    fireEvent.press(rejectButton);

    expect(mockOnReject).toHaveBeenCalled();
  });

  it('should disable buttons when loading', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={900}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
        isLoading={true}
      />
    );

    const acceptButton = screen.getByText('Accepting...');
    expect(acceptButton.props.disabled).toBe(true);
  });

  it('should format time correctly for hours', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={3600}
        estimatedDeliveryTime={3600}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('1h 0m')).toBeTruthy();
  });

  it('should calculate total time correctly', () => {
    render(
      <OrderPreviewCard
        order={mockOrder}
        distanceKm={2.5}
        estimatedPickupTime={600}
        estimatedDeliveryTime={1200}
        onAccept={mockOnAccept}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('30 min')).toBeTruthy();
  });
});
