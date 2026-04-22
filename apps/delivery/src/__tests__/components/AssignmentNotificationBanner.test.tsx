/**
 * Unit tests for AssignmentNotificationBanner component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AssignmentNotificationBanner } from '@/components/AssignmentNotificationBanner';
import { useAssignmentStore } from '@/store/assignment';

jest.mock('@/store/assignment');

const mockUseAssignmentStore = useAssignmentStore as jest.MockedFunction<
  typeof useAssignmentStore
>;

describe('AssignmentNotificationBanner', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when no assignments and not listening', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [],
      isListening: false,
      error: null,
    } as any);

    const { toJSON } = render(
      <AssignmentNotificationBanner onPress={mockOnPress} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render when listening', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [],
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('0 assignments available')).toBeTruthy();
  });

  it('should show pending count', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ] as any,
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('2 assignments available')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('should use singular form for single assignment', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [{ orderId: 'order-1' }] as any,
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('1 assignment available')).toBeTruthy();
  });

  it('should show error message when error exists', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [],
      isListening: false,
      error: 'Connection lost',
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('Connection lost')).toBeTruthy();
  });

  it('should call onPress when banner is pressed', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [{ orderId: 'order-1' }] as any,
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    const banner = screen.getByText('1 assignment available');
    fireEvent.press(banner);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should show connecting state when listening without pending', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [],
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('0 assignments available')).toBeTruthy();
  });

  it('should render badge with pending count', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
        { orderId: 'order-3' },
      ] as any,
      isListening: true,
      error: null,
    } as any);

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('3 assignments available')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('should update when pending count changes', () => {
    const { rerender } = render(
      <AssignmentNotificationBanner onPress={mockOnPress} />
    );

    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [{ orderId: 'order-1' }] as any,
      isListening: true,
      error: null,
    } as any);

    rerender(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('1 assignment available')).toBeTruthy();

    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ] as any,
      isListening: true,
      error: null,
    } as any);

    rerender(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('2 assignments available')).toBeTruthy();
  });

  it('should show error with red background', () => {
    mockUseAssignmentStore.mockReturnValue({
      pendingAssignments: [],
      isListening: false,
      error: 'Network error',
    } as any);

    const { getByTestId } = render(
      <AssignmentNotificationBanner
        onPress={mockOnPress}
        testID="error-banner"
      />
    );

    const banner = screen.getByText('Network error');
    expect(banner).toBeTruthy();
  });
});
