import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CancelReasonPicker } from '@/components/CancelReasonPicker';

describe('CancelReasonPicker', () => {
  const mockReasons = [
    'I changed my mind',
    'Item is out of stock',
    'Delivery is taking too long',
    'I ordered by mistake',
    'Shop is not responding',
    'Other reason',
  ];

  it('renders all reason options', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected={null}
        onSelect={() => {}}
      />
    );

    mockReasons.forEach((reason) => {
      expect(getByText(reason)).toBeTruthy();
    });
  });

  it('calls onSelect when a reason is selected', () => {
    const onSelectMock = jest.fn();
    const { getByText } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected={null}
        onSelect={onSelectMock}
      />
    );

    fireEvent.press(getByText('I changed my mind'));
    expect(onSelectMock).toHaveBeenCalledWith('I changed my mind');
  });

  it('shows selected reason visually', () => {
    const { getByTestId } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="I changed my mind"
        onSelect={() => {}}
        testID="reason-picker"
      />
    );
    expect(getByTestId('reason-picker')).toBeTruthy();
  });

  it('shows text input for "Other reason"', () => {
    const { getByPlaceholder } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="Other reason"
        onSelect={() => {}}
        onOtherReasonChange={() => {}}
      />
    );
    expect(getByPlaceholder('Please explain...')).toBeTruthy();
  });

  it('calls onOtherReasonChange when text is entered', () => {
    const onOtherReasonChangeMock = jest.fn();
    const { getByPlaceholder } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="Other reason"
        onSelect={() => {}}
        onOtherReasonChange={onOtherReasonChangeMock}
      />
    );

    const input = getByPlaceholder('Please explain...');
    fireEvent.changeText(input, 'Custom reason text');
    expect(onOtherReasonChangeMock).toHaveBeenCalledWith('Custom reason text');
  });

  it('respects maxLength on text input', () => {
    const { getByPlaceholder } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="Other reason"
        onSelect={() => {}}
        onOtherReasonChange={() => {}}
      />
    );

    const input = getByPlaceholder('Please explain...');
    expect(input).toHaveProp('maxLength', 500);
  });

  it('displays character count', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="Other reason"
        onSelect={() => {}}
        otherReason="Test"
        onOtherReasonChange={() => {}}
      />
    );
    expect(getByText('4/500')).toBeTruthy();
  });

  it('disables picker when disabled prop is true', () => {
    const { getByText } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected={null}
        onSelect={() => {}}
        disabled={true}
      />
    );

    const reason = getByText('I changed my mind');
    expect(reason.parent).toHaveProp('disabled', true);
  });

  it('handles empty reasons array', () => {
    const { getByTestId } = render(
      <CancelReasonPicker
        reasons={[]}
        selected={null}
        onSelect={() => {}}
        testID="empty-picker"
      />
    );
    expect(getByTestId('empty-picker')).toBeTruthy();
  });

  it('updates when selected reason changes', () => {
    const { rerender, getByTestId } = render(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="I changed my mind"
        onSelect={() => {}}
        testID="picker"
      />
    );

    rerender(
      <CancelReasonPicker
        reasons={mockReasons}
        selected="Other reason"
        onSelect={() => {}}
        testID="picker"
      />
    );

    expect(getByTestId('picker')).toBeTruthy();
  });
});
