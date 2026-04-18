/**
 * ProductToggleButton component tests
 * Tests rendering, loading, error, disabled states, callbacks, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProductToggleButton } from '@/components/product/ProductToggleButton';

describe('ProductToggleButton component', () => {
  const defaultProps = {
    productId: 'prod-1',
    productName: 'Tomatoes',
    isAvailable: true,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: Renders correctly
  test('renders with available state', () => {
    render(
      <ProductToggleButton
        {...defaultProps}
        isAvailable={true}
      />
    );

    const label = screen.getByText('Available');
    expect(label).toBeTruthy();
  });

  // Test 2: Renders unavailable state
  test('renders with unavailable state', () => {
    render(
      <ProductToggleButton
        {...defaultProps}
        isAvailable={false}
      />
    );

    const label = screen.getByText('Unavailable');
    expect(label).toBeTruthy();
  });

  // Test 3: Shows loading state
  test('shows loading spinner when isLoading is true', () => {
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        isLoading={true}
      />
    );

    const spinner = getByTestId('toggle-loading-prod-1');
    expect(spinner).toBeTruthy();
  });

  // Test 4: Shows error message
  test('shows error message and auto-dismisses', async () => {
    const errorMsg = 'Network error. Please try again.';
    const { getByTestId, getByText } = render(
      <ProductToggleButton
        {...defaultProps}
        error={errorMsg}
      />
    );

    expect(getByText(errorMsg)).toBeTruthy();

    // Wait for auto-dismiss (4 seconds)
    await waitFor(
      () => {
        expect(() => getByText(errorMsg)).toThrow();
      },
      { timeout: 5000 }
    );
  });

  // Test 5: Disables button when disabled prop is true (verified by functionality)
  test('disables button when disabled prop is true', () => {
    const mockOnToggle = jest.fn();
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        disabled={true}
        onToggle={mockOnToggle}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    // Check that the button has reduced opacity when disabled
    expect(button.props.style?.opacity).toBeLessThan(1);
    
    // Verify that toggle is not called (functional test)
    fireEvent.press(button);
    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  // Test 6: Calls onToggle callback with correct params
  test('calls onToggle with productId and current state', async () => {
    const mockOnToggle = jest.fn();
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        isAvailable={true}
        onToggle={mockOnToggle}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockOnToggle).toHaveBeenCalledWith('prod-1', true);
    });
  });

  // Test 7: Prevents toggling when disabled
  test('prevents toggle when disabled', () => {
    const mockOnToggle = jest.fn();
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        disabled={true}
        onToggle={mockOnToggle}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    fireEvent.press(button);

    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  // Test 8: Prevents rapid-tap when loading
  test('prevents rapid-tap by ignoring press when loading', () => {
    const mockOnToggle = jest.fn();
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        isLoading={true}
        onToggle={mockOnToggle}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    fireEvent.press(button);

    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  // Test 9: Accessibility labels (check via props)
  test('provides accessibility labels via props', () => {
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        isAvailable={true}
        isLoading={false}
        disabled={false}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    // Check accessibilityLabel prop is set correctly
    expect(button.props.accessibilityLabel).toContain('Tomatoes');
    expect(button.props.accessibilityLabel).toContain('Available');
  });

  // Test 10: Accessibility label when disabled (check via props)
  test('provides accessibility hint when disabled via props', () => {
    const { getByTestId } = render(
      <ProductToggleButton
        {...defaultProps}
        disabled={true}
      />
    );

    const button = getByTestId('product-toggle-prod-1');
    // Check accessibilityHint prop indicates disabled state
    expect(button.props.accessibilityHint).toContain('do not have permission');
  });
});
