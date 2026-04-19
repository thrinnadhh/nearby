/**
 * Frontend tests for LowStockEmptyState component
 * Validates: empty state, error state, dismissed state, actions
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LowStockEmptyState } from '../LowStockEmptyState';

describe('LowStockEmptyState', () => {
  describe('Happy State (No items below threshold)', () => {
    it('AC6: should display when no low stock products found', () => {
      const { getByText } = render(
        <LowStockEmptyState threshold={5} />
      );

      expect(getByText(/All Good!/i)).toBeTruthy();
    });

    it('AC6: should show success icon', () => {
      const { getByTestId } = render(
        <LowStockEmptyState threshold={5} />
      );

      const icon = getByTestId('empty-state-success-icon');
      expect(icon).toBeTruthy();
    });

    it('AC6: should display threshold value in message', () => {
      const { getByText } = render(
        <LowStockEmptyState threshold={10} />
      );

      expect(getByText(/10\s*units/)).toBeTruthy();
    });

    it('should use singular "unit" for threshold of 1', () => {
      const { getByText } = render(
        <LowStockEmptyState threshold={1} />
      );

      expect(getByText(/1\s*unit[^s]/)).toBeTruthy();
    });

    it('should show adjust threshold button', () => {
      const onAdjustThreshold = jest.fn();
      const { getByTestId } = render(
        <LowStockEmptyState
          threshold={5}
          onAdjustThreshold={onAdjustThreshold}
        />
      );

      const button = getByTestId('adjust-threshold-button');
      expect(button).toBeTruthy();
    });

    it('should call onAdjustThreshold when button is pressed', () => {
      const onAdjustThreshold = jest.fn();
      const { getByTestId } = render(
        <LowStockEmptyState
          threshold={5}
          onAdjustThreshold={onAdjustThreshold}
        />
      );

      const button = getByTestId('adjust-threshold-button');
      fireEvent.press(button);

      expect(onAdjustThreshold).toHaveBeenCalled();
    });
  });

  describe('Error State', () => {
    it('should display error icon when error provided', () => {
      const { getByTestId } = render(
        <LowStockEmptyState error="Network error" />
      );

      const icon = getByTestId('empty-state-error-icon');
      expect(icon).toBeTruthy();
    });

    it('should display error title', () => {
      const { getByText } = render(
        <LowStockEmptyState error="Network error" />
      );

      expect(getByText(/Unable to Load Alerts/i)).toBeTruthy();
    });

    it('should display error message', () => {
      const errorMsg = 'Failed to fetch products from server';
      const { getByText } = render(
        <LowStockEmptyState error={errorMsg} />
      );

      expect(getByText(errorMsg)).toBeTruthy();
    });

    it('should show retry button when error provided', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <LowStockEmptyState error="Network error" onRetry={onRetry} />
      );

      const button = getByTestId('retry-button');
      expect(button).toBeTruthy();
    });

    it('should call onRetry when retry button is pressed', () => {
      const onRetry = jest.fn();
      const { getByTestId } = render(
        <LowStockEmptyState error="Network error" onRetry={onRetry} />
      );

      const button = getByTestId('retry-button');
      fireEvent.press(button);

      expect(onRetry).toHaveBeenCalled();
    });

    it('should not show success message when error provided', () => {
      const { queryByText } = render(
        <LowStockEmptyState error="Network error" />
      );

      expect(queryByText(/All Good!/i)).toBeNull();
    });
  });

  describe('Dismissed State', () => {
    it('should display info icon when dismissed', () => {
      const { getByTestId } = render(
        <LowStockEmptyState isDismissedAllCleared={true} />
      );

      const icon = getByTestId('empty-state-info-icon');
      expect(icon).toBeTruthy();
    });

    it('should display dismissed title', () => {
      const { getByText } = render(
        <LowStockEmptyState isDismissedAllCleared={true} />
      );

      expect(getByText(/Dismissed Alerts Cleared/i)).toBeTruthy();
    });

    it('should display dismissed message', () => {
      const { getByText } = render(
        <LowStockEmptyState isDismissedAllCleared={true} />
      );

      expect(
        getByText(/previously dismissed products will be shown/i)
      ).toBeTruthy();
    });

    it('should not show error message when dismissed', () => {
      const { queryByText } = render(
        <LowStockEmptyState isDismissedAllCleared={true} error="Some error" />
      );

      expect(queryByText(/Some error/)).toBeNull();
    });

    it('should not show retry button when dismissed', () => {
      const { queryByTestId } = render(
        <LowStockEmptyState isDismissedAllCleared={true} />
      );

      const button = queryByTestId('retry-button');
      expect(button).toBeNull();
    });
  });

  describe('State Precedence', () => {
    it('should prioritize error state over success state', () => {
      const { getByText, queryByText } = render(
        <LowStockEmptyState
          threshold={5}
          error="Network error"
        />
      );

      expect(getByText(/Unable to Load Alerts/i)).toBeTruthy();
      expect(queryByText(/All Good!/i)).toBeNull();
    });

    it('should prioritize error state over dismissed state', () => {
      const { getByText, queryByText } = render(
        <LowStockEmptyState
          isDismissedAllCleared={true}
          error="Network error"
        />
      );

      expect(getByText(/Unable to Load Alerts/i)).toBeTruthy();
      expect(queryByText(/Dismissed Alerts Cleared/i)).toBeNull();
    });

    it('should show dismissed state when isDismissedAllCleared is true', () => {
      const { getByText } = render(
        <LowStockEmptyState
          threshold={5}
          isDismissedAllCleared={true}
        />
      );

      expect(getByText(/Dismissed Alerts Cleared/i)).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('should use default threshold of 5 when not provided', () => {
      const { getByText } = render(<LowStockEmptyState />);

      expect(getByText(/5\s*units/)).toBeTruthy();
    });

    it('should handle optional callbacks gracefully', () => {
      const { getByTestId } = render(
        <LowStockEmptyState threshold={5} />
      );

      // Should render without errors even without callbacks
      expect(getByTestId('empty-state-success-icon')).toBeTruthy();
    });

    it('should not crash with empty error string', () => {
      const { queryByText } = render(
        <LowStockEmptyState error="" />
      );

      // Empty error should be treated as no error
      expect(queryByText(/Unable to Load Alerts/i)).toBeNull();
    });

    it('should not show retry button when onRetry not provided', () => {
      const { queryByTestId } = render(
        <LowStockEmptyState error="Network error" />
      );

      const button = queryByTestId('retry-button');
      expect(button).toBeNull();
    });

    it('should not show adjust threshold button when onAdjustThreshold not provided', () => {
      const { queryByTestId } = render(
        <LowStockEmptyState threshold={5} />
      );

      const button = queryByTestId('adjust-threshold-button');
      expect(button).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const longError = 'E'.repeat(500);
      const { getByText } = render(
        <LowStockEmptyState error={longError} />
      );

      expect(getByText(new RegExp(longError.substring(0, 50)))).toBeTruthy();
    });

    it('should handle threshold of 0', () => {
      const { getByText } = render(
        <LowStockEmptyState threshold={0} />
      );

      expect(getByText(/0/)).toBeTruthy();
    });

    it('should handle threshold of 999', () => {
      const { getByText } = render(
        <LowStockEmptyState threshold={999} />
      );

      expect(getByText(/999\s*units/)).toBeTruthy();
    });

    it('should handle null values gracefully', () => {
      const { getByText } = render(
        <LowStockEmptyState
          threshold={5}
          error={null}
          isDismissedAllCleared={false}
        />
      );

      expect(getByText(/All Good!/i)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper test IDs', () => {
      const { getByTestId } = render(
        <LowStockEmptyState threshold={5} />
      );

      expect(getByTestId('empty-state-container')).toBeTruthy();
      expect(getByTestId('empty-state-success-icon')).toBeTruthy();
    });

    it('should have proper test IDs for error state', () => {
      const { getByTestId } = render(
        <LowStockEmptyState error="Network error" onRetry={() => {}} />
      );

      expect(getByTestId('empty-state-container')).toBeTruthy();
      expect(getByTestId('empty-state-error-icon')).toBeTruthy();
      expect(getByTestId('retry-button')).toBeTruthy();
    });
  });
});
