import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CancelOrderModal } from '@/app/(tabs)/order-detail/cancel-modal';

describe('CancelOrderModal Integration', () => {
  const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible is true', () => {
    const { getByText } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(getByText('Cancel Order')).toBeTruthy();
  });

  it('does not render modal when visible is false', () => {
    const { queryByText } = render(
      <CancelOrderModal
        visible={false}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(queryByText('Cancel Order')).toBeNull();
  });

  it('shows all cancellation reason options', () => {
    const { getByText } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    const reasons = [
      'I changed my mind',
      'Item is out of stock',
      'Delivery is taking too long',
      'I ordered by mistake',
      'Shop is not responding',
      'Other reason',
    ];

    reasons.forEach((reason) => {
      expect(getByText(reason)).toBeTruthy();
    });
  });

  it('calls onCancel when closing modal', () => {
    const { getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="cancel-modal"
      />
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit button when no reason is selected', () => {
    const { getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    const submitButton = getByTestId('submit-button');
    expect(submitButton).toHaveProp('disabled', true);
  });

  it('enables submit button when a reason is selected', async () => {
    const { getByText, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    const reasonButton = getByText('I changed my mind');
    fireEvent.press(reasonButton);

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      expect(submitButton).not.toHaveProp('disabled', true);
    });
  });

  it('calls onConfirm with selected reason', async () => {
    const { getByText, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    fireEvent.press(getByText('I changed my mind'));

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      fireEvent.press(submitButton);
    });

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('I changed my mind');
    });
  });

  it('requires text input for "Other reason"', async () => {
    const { getByText, getByPlaceholder, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    fireEvent.press(getByText('Other reason'));

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      expect(submitButton).toHaveProp('disabled', true);
    });

    const textInput = getByPlaceholder('Please explain...');
    fireEvent.changeText(textInput, 'Custom reason');

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      expect(submitButton).not.toHaveProp('disabled', true);
    });
  });

  it('validates minimum length for "Other reason" text', async () => {
    const { getByText, getByPlaceholder, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    fireEvent.press(getByText('Other reason'));

    const textInput = getByPlaceholder('Please explain...');
    fireEvent.changeText(textInput, 'ab'); // Too short

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      expect(submitButton).toHaveProp('disabled', true);
    });
  });

  it('shows loading state while submitting', async () => {
    mockOnConfirm.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { getByText, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        testID="submit-button"
      />
    );

    fireEvent.press(getByText('I changed my mind'));

    await waitFor(() => {
      const submitButton = getByTestId('submit-button');
      fireEvent.press(submitButton);
    });

    // Modal should show loading
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('disables all inputs while loading', () => {
    const { getByText, getByTestId } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
        isLoading={true}
        testID="cancel-button"
      />
    );

    const cancelButton = getByTestId('cancel-button');
    expect(cancelButton).toHaveProp('disabled', true);
  });

  it('displays refund information', () => {
    const { getByText } = render(
      <CancelOrderModal
        visible={true}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(getByText(/Refund|refund/i)).toBeTruthy();
    expect(getByText(/3-5 business days/i)).toBeTruthy();
  });
});
