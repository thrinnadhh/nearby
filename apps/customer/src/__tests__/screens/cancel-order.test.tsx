import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancelReasonPicker } from '@/components/CancelReasonPicker';
import { CancelOrderModal } from '@/app/(tabs)/order-detail/cancel-modal';

const REASONS = [
  'I changed my mind',
  'Item is out of stock',
  'Delivery is taking too long',
  'I ordered by mistake',
  'Shop is not responding',
  'Other reason',
];

describe('CancelReasonPicker Component', () => {
  const mockOnSelect = vi.fn();
  const mockOnOtherReasonChange = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnOtherReasonChange.mockClear();
  });

  it('should render all cancellation reasons', () => {
    render(
      <CancelReasonPicker
        reasons={REASONS}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    REASONS.forEach((reason) => {
      expect(screen.getByText(reason)).toBeTruthy();
    });
  });

  it('should handle reason selection', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected={null}
        onSelect={mockOnSelect}
      />
    );

    fireEvent.press(getByText('I changed my mind'));

    expect(mockOnSelect).toHaveBeenCalledWith('I changed my mind');
  });

  it('should highlight selected reason', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected="I changed my mind"
        onSelect={mockOnSelect}
      />
    );

    const selectedButton = getByText('I changed my mind').parent;
    expect(selectedButton).toBeTruthy();
  });

  it('should show text input for "Other reason"', async () => {
    const { getByPlaceholderText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected="Other reason"
        onSelect={mockOnSelect}
        otherReason=""
        onOtherReasonChange={mockOnOtherReasonChange}
      />
    );

    const input = getByPlaceholderText('Please explain...');
    expect(input).toBeTruthy();
  });

  it('should handle text input for other reason', async () => {
    const { getByPlaceholderText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected="Other reason"
        onSelect={mockOnSelect}
        otherReason=""
        onOtherReasonChange={mockOnOtherReasonChange}
      />
    );

    const input = getByPlaceholderText('Please explain...');
    fireEvent.changeText(input, 'This is my custom reason');

    expect(mockOnOtherReasonChange).toHaveBeenCalledWith(
      'This is my custom reason'
    );
  });

  it('should not show text input when other reason is not selected', () => {
    const { queryByPlaceholderText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected="I changed my mind"
        onSelect={mockOnSelect}
      />
    );

    expect(queryByPlaceholderText('Please explain...')).toBeNull();
  });

  it('should respect character limit for text input', async () => {
    const { getByPlaceholderText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected="Other reason"
        onSelect={mockOnSelect}
        otherReason=""
        onOtherReasonChange={mockOnOtherReasonChange}
      />
    );

    const input = getByPlaceholderText('Please explain...');
    expect(input.props.maxLength).toBe(500);
  });

  it('should disable all options when disabled prop is true', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={REASONS}
        selected={null}
        onSelect={mockOnSelect}
        disabled={true}
      />
    );

    const button = getByText('I changed my mind').parent;
    expect(button.props.disabled).toBe(true);
  });
});

describe('CancelOrderModal Component', () => {
  const mockOnCancel = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    mockOnCancel.mockClear();
    mockOnConfirm.mockReset();
  });

  it('should render modal when visible', () => {
    render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Cancel Order')).toBeTruthy();
    expect(screen.getByText('Refund Information')).toBeTruthy();
  });

  it('should not render modal when not visible', () => {
    const { queryByText } = render(
      <CancelOrderModal
        visible={false}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    // The modal content should not be rendered
    expect(queryByText('Cancel Order')).toBeNull();
  });

  it('should show refund information', () => {
    render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/3-5 business days/)).toBeTruthy();
  });

  it('should disable confirm button until reason is selected', () => {
    const { getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = getByRole('button', { name: /Cancel Order/ });
    expect(cancelButton.props.disabled).toBe(true);
  });

  it('should call onCancel when cancel button is pressed', () => {
    const { getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const keepButton = getByRole('button', { name: /Keep Order/ });
    fireEvent.press(keepButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm with selected reason when confirm is pressed', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    const { getByText, getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    // Select a reason
    fireEvent.press(getByText('I changed my mind'));

    // Click confirm
    const confirmButton = getByRole('button', { name: /Cancel Order/ });
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('I changed my mind');
    });
  });

  it('should disable buttons while loading', () => {
    const { getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />
    );

    const closeButton = getByRole('button').parent;
    expect(closeButton.props.disabled).toBe(true);
  });

  it('should handle custom reason for "Other reason" selection', async () => {
    mockOnConfirm.mockResolvedValue(undefined);

    const { getByText, getByPlaceholderText, getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Other reason"
    fireEvent.press(getByText('Other reason'));

    // Enter custom reason
    const input = getByPlaceholderText('Please explain...');
    fireEvent.changeText(input, 'My custom reason');

    // Click confirm
    const confirmButton = getByRole('button', { name: /Cancel Order/ });
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('My custom reason');
    });
  });

  it('should not allow confirmation with empty other reason', () => {
    const { getByText, getByRole } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Other reason"
    fireEvent.press(getByText('Other reason'));

    // Don't enter any text

    // Confirm button should be disabled
    const confirmButton = getByRole('button', { name: /Cancel Order/ });
    expect(confirmButton.props.disabled).toBe(true);
  });
});
