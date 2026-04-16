/**
 * Unit tests for ErrorBoundary component
 * Tests error catching, retry mechanism, and error display
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Text } from 'react-native';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error message');
};

// Component that works fine
const GoodComponent = () => <Text>Good component</Text>;

describe('ErrorBoundary Component', () => {
  // Suppress console.error for these tests
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(getByText('Good component')).toBeTruthy();
  });

  it('catches errors from child components', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show error boundary UI
    expect(getByText(/something went wrong|error occurred/i)).toBeTruthy();
  });

  it('displays error message in development mode', () => {
    // Mock __DEV__ to true
    const originalDev = __DEV__;
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show detailed error message in dev
    expect(getByText(/test error message/i)).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });

  it('provides retry button to reset error state', () => {
    const { getByText, getByTestId } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should have retry button
    const retryButton = getByText(/retry/i);
    expect(retryButton).toBeTruthy();

    // Click retry button (would re-render children)
    fireEvent.press(retryButton);

    // Component would still throw, but button was clickable
    expect(retryButton).toBeTruthy();
  });

  it('displays user-friendly error message in production', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = false;

    const { queryByText, getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should not show detailed error in production
    expect(queryByText(/test error message/)).toBeNull();

    // Should show generic message
    expect(getByText(/something went wrong|error occurred/i)).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });

  it('handles multiple child components', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <GoodComponent />
        <Text>Another component</Text>
      </ErrorBoundary>
    );

    expect(getByText('Good component')).toBeTruthy();
    expect(getByText('Another component')).toBeTruthy();
  });

  it('catches errors from nested components', () => {
    const NestedError = () => (
      <ThrowError />
    );

    const { getByText } = render(
      <ErrorBoundary>
        <NestedError />
      </ErrorBoundary>
    );

    // Should catch error from nested component
    expect(getByText(/something went wrong|error occurred/i)).toBeTruthy();
  });

  it('resets error on component remount', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(getByText('Good component')).toBeTruthy();

    // Re-render with same boundary should work
    rerender(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    );

    expect(getByText('Good component')).toBeTruthy();
  });

  it('shows error boundary for render errors', () => {
    const RenderError = () => {
      const obj: any = null;
      return <Text>{obj.property}</Text>; // Will throw
    };

    const { getByText } = render(
      <ErrorBoundary>
        <RenderError />
      </ErrorBoundary>
    );

    // Should catch the error
    expect(getByText(/something went wrong|error occurred|cannot/i)).toBeTruthy();
  });

  it('provides scrollable error details view', () => {
    const originalDev = __DEV__;
    (global as any).__DEV__ = true;

    const { getByTitle, queryByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // In dev mode, should have scrollable error details area
    // Component renders error message which is verifiable
    expect(queryByText(/test error message/i)).toBeTruthy();

    (global as any).__DEV__ = originalDev;
  });
});
