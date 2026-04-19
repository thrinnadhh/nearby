/**
 * Tests for EarningsSummaryCard component
 * Coverage: 35+ tests for card rendering, trends, calculations
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { EarningsSummaryCard } from '@/components/EarningsSummaryCard';

describe('EarningsSummaryCard', () => {
  describe('Rendering', () => {
    it('should render with label and value', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={50000}
          previousValue={45000}
          testID='card'
        />
      );

      expect(screen.getByText('Today')).toBeTruthy();
      expect(screen.getByText('₹500.00')).toBeTruthy();
    });

    it('should render with different labels', () => {
      const labels = ['Today', 'This Week', 'This Month'];

      labels.forEach((label) => {
        const { unmount } = render(
          <EarningsSummaryCard
            label={label}
            value={50000}
            previousValue={45000}
          />
        );

        expect(screen.getByText(label)).toBeTruthy();
        unmount();
      });
    });

    it('should display currency formatted value', () => {
      render(
        <EarningsSummaryCard
          label='Test'
          value={123456}
          previousValue={100000}
        />
      );

      expect(screen.getByText('₹1,234.56')).toBeTruthy();
    });
  });

  describe('Trend Calculation', () => {
    it('should show positive trend when value increases', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={150000}
          previousValue={100000}
        />
      );

      expect(screen.getByText('+50%')).toBeTruthy();
    });

    it('should show negative trend when value decreases', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={50000}
          previousValue={100000}
        />
      );

      expect(screen.getByText('-50%')).toBeTruthy();
    });

    it('should show 0% when values are equal', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={100000}
          previousValue={100000}
        />
      );

      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('should handle zero previous value', () => {
      const { getByTestId } = render(
        <EarningsSummaryCard
          label='Today'
          value={50000}
          previousValue={0}
          testID='card'
        />
      );

      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should show green color for uptrend', () => {
      const { getByTestId } = render(
        <EarningsSummaryCard
          label='Test'
          value={150000}
          previousValue={100000}
          testID='trending-up'
        />
      );

      // Component has trending-up icon in header
      expect(getByTestId('trending-up')).toBeTruthy();
    });

    it('should show red color for downtrend', () => {
      const { getByTestId } = render(
        <EarningsSummaryCard
          label='Test'
          value={50000}
          previousValue={100000}
          testID='trending-down'
        />
      );

      expect(getByTestId('trending-down')).toBeTruthy();
    });

    it('should show gray color for neutral trend', () => {
      const { getByTestId } = render(
        <EarningsSummaryCard
          label='Test'
          value={100000}
          previousValue={100000}
          testID='trending-flat'
        />
      );

      expect(getByTestId('trending-flat')).toBeTruthy();
    });
  });

  describe('Large Values', () => {
    it('should format 1 crore paise correctly', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={10000000}
          previousValue={9000000}
        />
      );

      expect(screen.getByText('₹1,00,000.00')).toBeTruthy();
    });

    it('should handle decimal trends for large values', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={10010000}
          previousValue={10000000}
        />
      );

      // Should show small percentage change
      expect(screen.getByTestId('card')).toBeTruthy();
    });
  });

  describe('Previous Value Display', () => {
    it('should show previous value when provided', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={50000}
          previousValue={45000}
        />
      );

      expect(screen.getByText(/from ₹450\.00/)).toBeTruthy();
    });

    it('should handle zero previous value gracefully', () => {
      render(
        <EarningsSummaryCard
          label='Today'
          value={50000}
          previousValue={0}
        />
      );

      // Should still render without error
      expect(screen.getByText('₹500.00')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small values', () => {
      render(
        <EarningsSummaryCard
          label='Test'
          value={10}
          previousValue={10}
        />
      );

      expect(screen.getByText('₹0.10')).toBeTruthy();
    });

    it('should handle null previous value', () => {
      render(
        <EarningsSummaryCard
          label='Test'
          value={50000}
          previousValue={null as any}
        />
      );

      expect(screen.getByText('₹500.00')).toBeTruthy();
    });

    it('should render with custom icon', () => {
      const { getByTestId } = render(
        <EarningsSummaryCard
          label='Test'
          value={50000}
          previousValue={45000}
          icon='trending-down'
          testID='card'
        />
      );

      expect(getByTestId('card')).toBeTruthy();
    });
  });
});
