import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Test component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

const WorkingComponent = () => <Text>This renders fine</Text>;

describe('ErrorBoundary Component', () => {
  // Suppress console.error for error boundary tests
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    
    expect(getByText('This renders fine')).toBeDefined();
  });

  it('catches errors and displays fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    // Should show error UI instead of crashing
    expect(getByText(/something went wrong|error occurred/i)).toBeDefined();
  });

  it('displays error message in fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(getByText(/test error/i)).toBeDefined();
  });

  it('provides retry functionality', () => {
    const { getByText, rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    // Should have a retry button
    expect(getByText(/try again|retry/i)).toBeDefined();
  });

  it('resets error state on component unmount and remount', () => {
    const { unmount } = render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    
    unmount();
    
    // Remount should work
    const { getByText } = render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );
    
    expect(getByText('This renders fine')).toBeDefined();
  });

  it('logs error information', () => {
    const loggerSpy = jest.fn();
    
    render(
      <ErrorBoundary onError={loggerSpy}>
        <ThrowError />
      </ErrorBoundary>
    );
    
    expect(loggerSpy).toHaveBeenCalledWith(expect.any(Error));
  });

  it('renders fallback UI with proper styling', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    
    const fallback = getByTestId('error-fallback');
    expect(fallback.props.style).toBeDefined();
  });
});
