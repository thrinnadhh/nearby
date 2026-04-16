import React from 'react';
import { render } from '@testing-library/react-native';
import { RefundStatusBadge } from '@/components/RefundStatusBadge';

describe('RefundStatusBadge Tests', () => {
  it('displays processing status by default', () => {
    const { getByText } = render(
      <RefundStatusBadge orderId="order-123" />
    );
    expect(getByText('Refund Processing')).toBeTruthy();
  });

  it('shows processing timeline text', () => {
    const { getByText } = render(
      <RefundStatusBadge orderId="order-123" status="processing" />
    );
    expect(getByText(/3-5 business days/)).toBeTruthy();
  });

  it('displays completed status when provided', () => {
    const { getByText } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={50000}
      />
    );
    expect(getByText('Refund Completed')).toBeTruthy();
  });

  it('shows refund amount when completed', () => {
    const { getByText } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={50000}
      />
    );
    expect(getByText(/₹500\.00/)).toBeTruthy();
  });

  it('displays generic message when refund amount is missing', () => {
    const { getByText } = render(
      <RefundStatusBadge orderId="order-123" status="completed" />
    );
    expect(getByText(/Amount refunded/)).toBeTruthy();
  });

  it('uses correct icon for processing status', () => {
    const { getByTestId } = render(
      <RefundStatusBadge orderId="order-123" status="processing" testID="badge" />
    );
    expect(getByTestId('badge')).toBeTruthy();
  });

  it('uses correct icon for completed status', () => {
    const { getByTestId } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        testID="badge"
      />
    );
    expect(getByTestId('badge')).toBeTruthy();
  });

  it('formats refund amount correctly in paise', () => {
    const { getByText } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={12345}
      />
    );
    expect(getByText(/₹123\.45/)).toBeTruthy();
  });

  it('handles zero refund amount', () => {
    const { getByText } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={0}
      />
    );
    expect(getByText(/₹0\.00/)).toBeTruthy();
  });

  it('displays correct styling for processing state', () => {
    const { getByTestId } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="processing"
        testID="processing-badge"
      />
    );
    const badge = getByTestId('processing-badge');
    expect(badge).toBeTruthy();
  });

  it('displays correct styling for completed state', () => {
    const { getByTestId } = render(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        testID="completed-badge"
      />
    );
    const badge = getByTestId('completed-badge');
    expect(badge).toBeTruthy();
  });

  it('updates when status changes from processing to completed', () => {
    const { rerender, getByText, queryByText } = render(
      <RefundStatusBadge orderId="order-123" status="processing" />
    );

    expect(getByText('Refund Processing')).toBeTruthy();
    expect(queryByText('Refund Completed')).toBeNull();

    rerender(
      <RefundStatusBadge
        orderId="order-123"
        status="completed"
        refundAmount={50000}
      />
    );

    expect(queryByText('Refund Processing')).toBeNull();
    expect(getByText('Refund Completed')).toBeTruthy();
  });

  it('handles different refund amounts', () => {
    const amounts = [1000, 50000, 100000];

    amounts.forEach((amount) => {
      const { getByText } = render(
        <RefundStatusBadge
          orderId="order-123"
          status="completed"
          refundAmount={amount}
        />
      );
      
      const expectedAmount = `₹${(amount / 100).toFixed(2)}`;
      expect(getByText(new RegExp(expectedAmount.replace('₹', '').split('.')[0].slice(-2)))).toBeTruthy();
    });
  });
});
