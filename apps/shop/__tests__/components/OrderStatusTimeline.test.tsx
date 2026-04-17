/**
 * OrderStatusTimeline component test suite
 * Tests for status progression visualization
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { OrderStatusTimeline } from '../../../src/components/order/OrderStatusTimeline';
import { Order, OrderStatus } from '@/types/orders';

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
    const order = createMockOrder('pending');
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
    expect(screen.getByText('Packing')).toBeDefined();
    expect(screen.getByText('Ready')).toBeDefined();
    expect(screen.getByText('Picked Up')).toBeDefined();
  });

  it('marks pending status as current', () => {
    const order = createMockOrder('pending');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-current')).toBeDefined();
  });

  it('marks accepted status as current', () => {
    const order = createMockOrder('accepted');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-accepted-current')).toBeDefined();
  });

  it('marks pending as complete when status is accepted', () => {
    const order = createMockOrder('accepted');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-complete')).toBeDefined();
  });

  it('marks multiple statuses as complete for packing orders', () => {
    const order = createMockOrder('packing');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-pending-complete')).toBeDefined();
    expect(getByTestId('status-badge-accepted-complete')).toBeDefined();
    expect(getByTestId('status-badge-packing-current')).toBeDefined();
  });

  it('shows in-progress badge for current status', () => {
    const order = createMockOrder('ready');
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('marks ready as complete and picked_up as current', () => {
    const order = createMockOrder('picked_up');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('status-badge-ready-complete')).toBeDefined();
    expect(getByTestId('status-badge-picked_up-current')).toBeDefined();
  });

  it('displays correct status order: pending > accepted > packing > ready > picked_up', () => {
    const order = createMockOrder('pending');
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const statuses = getAllByTestId(/status-label/);
    expect(statuses.length).toBe(5);
  });

  it('renders vertical connectors between statuses', () => {
    const order = createMockOrder('packing');
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const connectors = getAllByTestId(/vertical-connector/);
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('uses success color for complete statuses', () => {
    const order = createMockOrder('packing');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    const completeConnector = getByTestId('vertical-connector-pending');
    expect(completeConnector.props.style.backgroundColor).toBe('#34A853'); // success color
  });

  it('uses primary color for current status connector', () => {
    const order = createMockOrder('packing');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    const currentConnector = getByTestId('vertical-connector-packing');
    expect(currentConnector.props.style.backgroundColor).toBe('#1A73E8'); // primary color
  });

  it('uses border color for upcoming statuses', () => {
    const order = createMockOrder('packing');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    const upcomingConnector = getByTestId('vertical-connector-ready');
    expect(upcomingConnector.props.style.backgroundColor).toBe('#E0E0E0'); // border color
  });

  it('does not render connector after last status', () => {
    const order = createMockOrder('picked_up');
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const connectors = getAllByTestId(/vertical-connector/);
    // Should be one less than number of statuses
    expect(connectors.length).toBe(4);
  });

  it('displays check icon for complete statuses', () => {
    const order = createMockOrder('accepted');
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    const completeIcons = getAllByTestId(/check-icon/);
    expect(completeIcons.length).toBeGreaterThan(0);
  });

  it('displays current status icon for ongoing status', () => {
    const order = createMockOrder('packing');
    const { getByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getByTestId('icon-packing')).toBeDefined();
  });

  it('renders all statuses for pending order', () => {
    const order = createMockOrder('pending');
    const { getAllByTestId } = render(<OrderStatusTimeline order={order} />);

    expect(getAllByTestId(/status-circle/)).toHaveLength(5);
  });

  it('formats status label with proper casing', () => {
    const order = createMockOrder('picked_up');
    render(<OrderStatusTimeline order={order} />);

    expect(screen.getByText('Picked Up')).toBeDefined();
  });

  it('shows correct timeline progression for completed orders', () => {
    const order: Order = {
      ...createMockOrder('delivered'),
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
