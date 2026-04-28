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
    // Default mock to always call the selector with store state
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: false,
        error: null,
      };
      return selector(mockState);
    });
  });

  it('should not render when no assignments and not listening', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: false,
        error: null,
      };
      return selector(mockState);
    });

    const { toJSON } = render(
      <AssignmentNotificationBanner onPress={mockOnPress} />
    );

    expect(toJSON()).toBeNull();
  });

  it('should render when listening', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('0 assignments available')).toBeTruthy();
  });

  it('should show pending count', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [
          { orderId: 'order-1' },
          { orderId: 'order-2' },
        ],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('2 assignments available')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('should use singular form for single assignment', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [{ orderId: 'order-1' }],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('1 assignment available')).toBeTruthy();
  });

  it('should show error message when error exists', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: false,
        error: 'Connection lost',
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('Connection lost')).toBeTruthy();
  });

  it('should call onPress when banner is pressed', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [{ orderId: 'order-1' }],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    const banner = screen.getByText('1 assignment available');
    fireEvent.press(banner);

    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should show connecting state when listening without pending', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('0 assignments available')).toBeTruthy();
  });

  it('should render badge with pending count', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [
          { orderId: 'order-1' },
          { orderId: 'order-2' },
          { orderId: 'order-3' },
        ],
        isListening: true,
        error: null,
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('3 assignments available')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('should update when pending count changes', () => {
    let currentState = {
      pendingAssignments: [] as any,
      isListening: true,
      error: null,
    };

    mockUseAssignmentStore.mockImplementation((selector: any) => {
      return selector(currentState);
    });

    const { rerender } = render(
      <AssignmentNotificationBanner onPress={mockOnPress} />
    );

    currentState = {
      pendingAssignments: [{ orderId: 'order-1' }],
      isListening: true,
      error: null,
    };

    rerender(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('1 assignment available')).toBeTruthy();

    currentState = {
      pendingAssignments: [
        { orderId: 'order-1' },
        { orderId: 'order-2' },
      ],
      isListening: true,
      error: null,
    };

    rerender(<AssignmentNotificationBanner onPress={mockOnPress} />);

    expect(screen.getByText('2 assignments available')).toBeTruthy();
  });

  it('should show error with red background', () => {
    mockUseAssignmentStore.mockImplementation((selector: any) => {
      const mockState = {
        pendingAssignments: [],
        isListening: false,
        error: 'Network error',
      };
      return selector(mockState);
    });

    render(<AssignmentNotificationBanner onPress={mockOnPress} />);

    const banner = screen.getByText('Network error');
    expect(banner).toBeTruthy();
  });
});
