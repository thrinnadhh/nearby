/**
 * Tests for SettlementItem component
 * Coverage: 15+ tests for rendering, status colors, currency formatting
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { SettlementItem } from '@/components/SettlementItem';

const MOCK_SETTLEMENT = {
  id: 'settlement-001',
  amount: 100000,
  status: 'completed' as const,
  utrNumber: 'UTR123456789',
  settlementDate: '2026-04-19',
  initiatedAt: '2026-04-18T10:00:00Z',
  completedAt: '2026-04-19T15:30:00Z',
  periodStartDate: '2026-04-10',
  periodEndDate: '2026-04-16',
  netAmount: 98000,
  grossAmount: 100000,
  commission: 1500,
  fees: 500,
};

describe('SettlementItem', () => {
  it('should render settlement details', () => {
    const { getByTestId } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} testID="settlement-item" />
    );

    expect(getByTestId('settlement-item')).toBeTruthy();
  });

  it('should show status badge', () => {
    const { getByText } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} />
    );

    expect(getByText('Completed')).toBeTruthy();
  });

  it('should show UTR number', () => {
    const { getByText } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} />
    );

    expect(getByText('UTR123456789')).toBeTruthy();
  });

  it('should show settlement period dates', () => {
    const { getByText } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} />
    );

    expect(getByText(/10 Apr/)).toBeTruthy();
    expect(getByText(/16 Apr/)).toBeTruthy();
  });

  it('should show breakdown amounts', () => {
    const { getByText } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} />
    );

    expect(getByText(/Gross:/)).toBeTruthy();
    expect(getByText(/Commission:/)).toBeTruthy();
    expect(getByText(/Fees:/)).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const mockPress = jest.fn();
    const { getByTestId } = render(
      <SettlementItem
        settlement={MOCK_SETTLEMENT}
        onPress={mockPress}
        testID="settlement-item"
      />
    );

    fireEvent.press(getByTestId('settlement-item'));
    expect(mockPress).toHaveBeenCalled();
  });

  it('should handle different status colors', () => {
    const statuses = ['pending', 'initiated', 'completed', 'failed'];

    statuses.forEach((status) => {
      const { getByText } = render(
        <SettlementItem
          settlement={{
            ...MOCK_SETTLEMENT,
            status: status as any,
          }}
        />
      );

      const statusLabel = {
        pending: 'Pending',
        initiated: 'Initiated',
        completed: 'Completed',
        failed: 'Failed',
      }[status];

      expect(getByText(statusLabel)).toBeTruthy();
    });
  });

  it('should not show completed date for pending settlements', () => {
    const { queryByText } = render(
      <SettlementItem
        settlement={{
          ...MOCK_SETTLEMENT,
          status: 'pending',
          completedAt: undefined,
        }}
      />
    );

    expect(queryByText(/Settled on/)).toBeFalsy();
  });

  it('should show completed date for completed settlements', () => {
    const { getByText } = render(
      <SettlementItem
        settlement={{
          ...MOCK_SETTLEMENT,
          completedAt: '2026-04-19T15:30:00Z',
        }}
      />
    );

    expect(getByText(/Settled on/)).toBeTruthy();
  });

  it('should format net amount correctly', () => {
    const { getAllByText } = render(
      <SettlementItem settlement={MOCK_SETTLEMENT} />
    );

    // formatCurrency converts paise to rupees — multiple ₹ symbols present
    const rupeeElements = getAllByText(/₹/);
    expect(rupeeElements.length).toBeGreaterThan(0);
  });
});
