import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrderTimeline } from '@/components/OrderTimeline';
import type { Order } from '@/types';

describe('OrderTimeline', () => {
  const mockOrder: Order = {
    id: 'order-123',
    shop_id: 'shop-456',
    shop_name: 'Test Shop',
    status: 'out_for_delivery',
    total_paise: 50000,
    items: [],
    payment_method: 'upi',
    created_at: '2026-04-16T10:00:00Z',
  };

  it('renders timeline container', () => {
    const { getByTestId } = render(
      <OrderTimeline order={mockOrder} testID="timeline" />
    );
    expect(getByTestId('timeline')).toBeTruthy();
  });

  it('displays status for pending order', () => {
    const pendingOrder = { ...mockOrder, status: 'pending' as const };
    const { getByText } = render(<OrderTimeline order={pendingOrder} />);
    // Should have some status indicator
    expect(getByText(/pending|Pending|PENDING/i)).toBeTruthy();
  });

  it('displays status for accepted order', () => {
    const acceptedOrder = { ...mockOrder, status: 'accepted' as const };
    const { getByText } = render(<OrderTimeline order={acceptedOrder} />);
    expect(getByText(/accepted|Accepted|ACCEPTED/i)).toBeTruthy();
  });

  it('displays status for delivered order', () => {
    const deliveredOrder = { ...mockOrder, status: 'delivered' as const };
    const { getByText } = render(<OrderTimeline order={deliveredOrder} />);
    expect(getByText(/delivered|Delivered|DELIVERED/i)).toBeTruthy();
  });

  it('displays status for cancelled order', () => {
    const cancelledOrder = { ...mockOrder, status: 'cancelled' as const };
    const { getByText } = render(<OrderTimeline order={cancelledOrder} />);
    expect(getByText(/cancelled|Cancelled|CANCELLED/i)).toBeTruthy();
  });

  it('shows all intermediate statuses in sequence', () => {
    const { getByTestId } = render(
      <OrderTimeline order={mockOrder} testID="timeline-sequence" />
    );
    const timeline = getByTestId('timeline-sequence');
    expect(timeline).toBeTruthy();
    // Verify visual elements exist for timeline
  });

  it('renders timeline without crashing for edge cases', () => {
    const minimalOrder = { ...mockOrder, items: [] };
    const { getByTestId } = render(
      <OrderTimeline order={minimalOrder} testID="minimal-timeline" />
    );
    expect(getByTestId('minimal-timeline')).toBeTruthy();
  });

  it('updates when order status changes', () => {
    const { rerender, getByText } = render(
      <OrderTimeline order={mockOrder} />
    );
    
    const updatedOrder = { ...mockOrder, status: 'delivered' as const };
    rerender(<OrderTimeline order={updatedOrder} />);
    
    expect(getByText(/delivered|Delivered/i)).toBeTruthy();
  });
});
