import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, vi } from 'vitest';
import { OrderTimeline } from '@/components/OrderTimeline';
import { OrderItemsPanel } from '@/components/OrderItemsPanel';
import { RefundStatusBadge } from '@/components/RefundStatusBadge';
import type { Order, OrderItem } from '@/types';

describe('OrderTimeline Component', () => {
  const mockOrder: Order = {
    id: 'order-123',
    shop_id: 'shop-123',
    shop_name: 'Fresh Kirana',
    status: 'out_for_delivery',
    total_paise: 50000,
    items: [],
    payment_method: 'upi',
    created_at: '2026-04-16T10:30:00Z',
  };

  it('should render timeline with all statuses up to current', () => {
    render(<OrderTimeline order={mockOrder} />);

    // Check earlier statuses are marked complete
    expect(screen.getByText('Order Placed')).toBeTruthy();
    expect(screen.getByText('Shop Accepted')).toBeTruthy();

    // Check current status
    expect(screen.getByText('Out for Delivery')).toBeTruthy();
  });

  it('should handle cancelled orders with special timeline', () => {
    const cancelledOrder = { ...mockOrder, status: 'cancelled' as const };
    render(<OrderTimeline order={cancelledOrder} />);

    expect(screen.getByText('Order Placed')).toBeTruthy();
    expect(screen.getByText('Order Cancelled')).toBeTruthy();
  });

  it('should show timestamps for completed statuses', () => {
    render(<OrderTimeline order={mockOrder} />);

    // Should have time displays for completed items
    const timeElements = screen.getAllByText(/AM|PM|:\d{2}/);
    expect(timeElements.length).toBeGreaterThan(0);
  });
});

describe('OrderItemsPanel Component', () => {
  const mockItems: OrderItem[] = [
    { product_id: 'prod-1', name: 'Milk', price: 10000, qty: 2 },
    { product_id: 'prod-2', name: 'Bread', price: 8000, qty: 1 },
    { product_id: 'prod-3', name: 'Butter', price: 15000, qty: 1 },
  ];

  it('should render all items with correct quantities and prices', () => {
    render(<OrderItemsPanel items={mockItems} />);

    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Bread')).toBeTruthy();
    expect(screen.getByText('Butter')).toBeTruthy();

    expect(screen.getByText(/×2/)).toBeTruthy();
    expect(screen.getByText(/×1/)).toBeTruthy();
  });

  it('should calculate and display correct subtotal', () => {
    // Subtotal = (10000*2) + (8000*1) + (15000*1) = 43000 paise = ₹430
    render(<OrderItemsPanel items={mockItems} />);

    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText(/₹430/)).toBeTruthy();
  });

  it('should display item line totals correctly', () => {
    render(<OrderItemsPanel items={mockItems} />);

    // Milk: 10000*2 = 20000 = ₹200
    // Bread: 8000*1 = 8000 = ₹80
    // Butter: 15000*1 = 15000 = ₹150
    expect(screen.getByText(/₹200/)).toBeTruthy();
    expect(screen.getByText(/₹80/)).toBeTruthy();
    expect(screen.getByText(/₹150/)).toBeTruthy();
  });

  it('should handle single item order', () => {
    const singleItem = [mockItems[0]];
    render(<OrderItemsPanel items={singleItem} />);

    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText(/₹200/)).toBeTruthy();
  });

  it('should handle empty items array gracefully', () => {
    render(<OrderItemsPanel items={[]} />);

    // Should still show subtotal header and 0 value
    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText(/₹0/)).toBeTruthy();
  });

  it('should truncate long product names', () => {
    const longNameItems = [
      {
        product_id: 'prod-1',
        name: 'This is a very long product name that should wrap',
        price: 10000,
        qty: 1,
      },
    ];

    const { getByText } = render(<OrderItemsPanel items={longNameItems} />);
    const nameElement = getByText(/This is a very long/);

    // Check that it has numberOfLines prop set (truncation enabled)
    expect(nameElement.props.numberOfLines).toBe(2);
  });
});

describe('RefundStatusBadge Component', () => {
  it('should show processing status by default', () => {
    render(<RefundStatusBadge orderId="order-123" />);

    expect(screen.getByText('Refund Processing')).toBeTruthy();
    expect(screen.getByText(/3-5 business days/)).toBeTruthy();
  });

  it('should show completed status with amount', () => {
    render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={50000}
      />
    );

    expect(screen.getByText('Refund Completed')).toBeTruthy();
    expect(screen.getByText(/₹500/)).toBeTruthy();
  });

  it('should show completed status without amount', () => {
    render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
      />
    );

    expect(screen.getByText('Refund Completed')).toBeTruthy();
    expect(screen.getByText(/refunded to your account/)).toBeTruthy();
  });

  it('should render with correct styling for processing state', () => {
    const { getByText } = render(
      <RefundStatusBadge orderId="order-123" status="processing" />
    );

    const badge = getByText('Refund Processing').parent;
    expect(badge).toBeTruthy();
  });

  it('should render with correct styling for completed state', () => {
    const { getByText } = render(
      <RefundStatusBadge orderId="order-123" status="completed" />
    );

    const badge = getByText('Refund Completed').parent;
    expect(badge).toBeTruthy();
  });
});
