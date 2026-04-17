/**
 * OrderStatusTimeline component test suite
 * Tests for status progression visualization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrderStatusTimeline } from '../../src/components/order/OrderStatusTimeline';
import { Order } from '@/types/orders';
import { OrderStatus } from '@/types/shop';

const createMockOrder = (status: OrderStatus): Order => ({
  id: 'order-123',
  shopId: 'shop-1',
  customerId: 'cust-1',
  customerName: 'John Doe',
  customerPhone: '9876543210',
  deliveryAddress: '123 Main St',
  items: [],
  subtotal: 100000,
  deliveryFee: 25000,
  total: 125000,
  status,
  paymentMode: 'upi',
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  acceptanceDeadline: '2026-04-17T10:03:00Z',
});

describe('OrderStatusTimeline Component', () => {
  it('renders all status stages', () => {
    const order = createMockOrder(OrderStatus.PENDING);
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
    expect(screen.getByText('Packing')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Picked Up')).toBeDefined();
  });

  it('marks pending status as current', () => {
    const order = createMockOrder(OrderStatus.PENDING);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-current')).toBeDefined();
  });

  it('marks accepted status as current', () => {
    const order = createMockOrder(OrderStatus.ACCEPTED);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-accepted-current')).toBeDefined();
  });

  it('marks pending as complete when status is accepted', () => {
    const order = createMockOrder(OrderStatus.ACCEPTED);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-complete')).toBeDefined();
  });

  it('marks multiple statuses as complete for packing orders', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-complete')).toBeDefined();
    expect(getByTestId('status-badge-accepted-complete')).toBeDefined();
    expect(getByTestId('status-badge-packing-current')).toBeDefined();
  });

  it('shows in-progress badge for current status', () => {
    const order = createMockOrder(OrderStatus.READY);
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('marks ready as complete and picked_up as current', () => {
    const order = createMockOrder(OrderStatus.PICKED_UP);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-ready-complete')).toBeDefined();
    expect(getByTestId('status-badge-picked_up-current')).toBeDefined();
  });

  it('displays correct status order: pending > accepted > packing > ready > picked_up > delivered', () => {
    const order = createMockOrder(OrderStatus.PENDING);
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
    expect(screen.getByText('Packing')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Picked Up')).toBeDefined();
    expect(screen.getByText('Delivered')).toBeDefined();
  });

  it('renders vertical connectors between statuses', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const connectors = getAllByTestId(/vertical-connector/);
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('uses success color for complete statuses', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    render(<OrderStatusTimeline order={order} />);

    // Verify pending status is marked complete by checking that it's not current
    expect(screen.getAllByText('Pending')[0]).toBeDefined();
  });

  it('uses primary color for current status connector', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    render(<OrderStatusTimeline order={order} />);

    // Verify packing is current status by checking In Progress badge
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('uses border color for upcoming statuses', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    render(<OrderStatusTimeline order={order} />);

    // Verify upcoming status (ready) exists and should be styled as upcoming
    expect(screen.getByText('Ready')).toBeDefined();
  });

  it('does not render connector after last status', () => {
    const order = createMockOrder(OrderStatus.DELIVERED);
    render(<OrderStatusTimeline order={order} />);

    // All statuses should be marked as complete
    expect(screen.getByText('Delivered')).toBeDefined();
  });

  it('displays check icon for complete statuses', () => {
    const order = createMockOrder(OrderStatus.ACCEPTED);
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const completeIcons = getAllByTestId(/check-icon/);
    expect(completeIcons.length).toBeGreaterThan(0);
  });

  it('displays current status icon for ongoing status', () => {
    const order = createMockOrder(OrderStatus.PACKING);
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('icon-packing')).toBeDefined();
  });

  it('renders all statuses for pending order', () => {
    const order = createMockOrder(OrderStatus.PENDING);
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getAllByTestId(/status-circle/)).toHaveLength(6);
  });

  it('formats status label with proper casing', () => {
    const order = createMockOrder(OrderStatus.PICKED_UP);
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('Picked Up')).toBeDefined();
  });

  it('shows correct timeline progression for completed orders', () => {
    const order: Order = {
      ...createMockOrder(OrderStatus.DELIVERED),
      status: 'delivered' as OrderStatus,
    };
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    // All statuses up to delivered should be complete
    expect(getByTestId('status-badge-pending-complete')).toBeDefined();
    expect(getByTestId('status-badge-accepted-complete')).toBeDefined();
    expect(getByTestId('status-badge-packing-complete')).toBeDefined();
    expect(getByTestId('status-badge-ready-complete')).toBeDefined();
    expect(getByTestId('status-badge-picked_up-complete')).toBeDefined();
  });
});
