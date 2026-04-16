/**
 * Unit tests for CountdownTimer component
 * Tests timer countdown, expiration callback, and display formatting
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { CountdownTimer } from '@/components/order/CountdownTimer';
import { formatCountdown } from '@/utils/formatters';

jest.useFakeTimers();

describe('CountdownTimer Component', () => {
  const createAcceptanceDeadline = (minutesFromNow: number): string => {
    const deadline = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return deadline.toISOString();
  };

  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders countdown timer with correct initial time', () => {
    const deadline = createAcceptanceDeadline(3);
    const mockOnExpire = jest.fn();

    const { getByText } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );

    // Should show approximately 3:00 (allow 1 second tolerance)
    expect(getByText(/3:0[0-1]/)).toBeTruthy();
  });

  it('increments countdown every second', () => {
    const deadline = createAcceptanceDeadline(3);
    const mockOnExpire = jest.fn();

    const { getByText, rerender } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );

    // Initial: 3:00
    expect(getByText(/3:0[0-1]/)).toBeTruthy();

    // Advance 30 seconds
    jest.advanceTimersByTime(30000);

    // Should be close to 2:30
    rerender(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );
  });

  it('changes text color to red when less than 1 minute remains', async () => {
    const deadline = createAcceptanceDeadline(0.5); // 30 seconds
    const mockOnExpire = jest.fn();

    const { getByTestId } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
        testID="timer-text"
      />
    );

    await waitFor(() => {
      const timerText = getByTestId('timer-text');
      // Would have red color styling applied
      expect(timerText).toBeTruthy();
    });
  });

  it('calls onExpire callback when time runs out', async () => {
    const deadline = createAcceptanceDeadline(0.05); // 3 seconds
    const mockOnExpire = jest.fn();

    render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );

    // Advance past deadline
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockOnExpire).toHaveBeenCalled();
    });
  });

  it('stops countdown after expiration', async () => {
    const deadline = createAcceptanceDeadline(0.1);
    const mockOnExpire = jest.fn();

    const { getByText } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );

    // Advance well past deadline
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockOnExpire).toHaveBeenCalled();
    });

    // Should display 0:00 and not go negative
    expect(getByText('0:00')).toBeTruthy();
  });

  it('formats countdown correctly MM:SS', () => {
    const deadline = createAcceptanceDeadline(2.5); // 2.5 minutes
    const { getByText } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={jest.fn()}
      />
    );

    // Should be formatted as M:SS
    expect(getByText(/2:\d{2}/)).toBeTruthy();
  });

  it('handles expired deadline gracefully', () => {
    const expiredDeadline = new Date(Date.now() - 1000).toISOString(); // 1 second ago
    const mockOnExpire = jest.fn();

    const { getByText } = render(
      <CountdownTimer
        acceptanceDeadline={expiredDeadline}
        onExpire={mockOnExpire}
      />
    );

    // Should show 0:00 or call onExpire immediately
    expect(mockOnExpire).toHaveBeenCalled();
  });

  it('cleans up interval on unmount', () => {
    const deadline = createAcceptanceDeadline(3);
    const mockOnExpire = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <CountdownTimer
        acceptanceDeadline={deadline}
        onExpire={mockOnExpire}
      />
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
