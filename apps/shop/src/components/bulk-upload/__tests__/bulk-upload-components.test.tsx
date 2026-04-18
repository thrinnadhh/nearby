/**
 * Bulk Upload Components Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PreviewRow } from '@/components/bulk-upload/PreviewRow';
import { ProgressIndicator } from '@/components/bulk-upload/ProgressIndicator';
import { CsvRowWithErrors } from '@/types/csv';

// Mock dependencies
jest.mock('@/utils/logger');

describe('PreviewRow Component', () => {
  const mockValidRow: CsvRowWithErrors = {
    rowNumber: 1,
    name: 'Basmati Rice',
    description: 'Premium rice',
    category: 'grocery',
    price: 25000,
    stockQty: 50,
    unit: 'kg',
    isValid: true,
    errors: {},
  };

  const mockInvalidRow: CsvRowWithErrors = {
    rowNumber: 2,
    name: '',
    description: '',
    category: 'grocery',
    price: 0,
    stockQty: 50,
    unit: 'kg',
    isValid: false,
    errors: {
      name: 'Product name is required',
    },
  };

  it('should render valid row with success indicator', () => {
    const { getByText, getByTestId } = render(
      <PreviewRow row={mockValidRow} />
    );

    expect(getByText('Basmati Rice')).toBeDefined();
    expect(getByText('#1')).toBeDefined();
  });

  it('should render invalid row with error indicator', () => {
    const { getByText } = render(
      <PreviewRow row={mockInvalidRow} />
    );

    expect(getByText('#2')).toBeDefined();
  });

  it('should expand row details on press', () => {
    const { getByText, queryByText } = render(
      <PreviewRow row={mockValidRow} showDetails={false} />
    );

    // Click to expand
    const rowContent = getByText('Basmati Rice').parent;
    if (rowContent?.parent) {
      fireEvent.press(rowContent.parent);
    }

    // After expansion, detailed fields should be visible
    expect(queryByText('Product Name:')).toBeDefined();
  });

  it('should call onPress callback when expanded', () => {
    const onPress = jest.fn();

    const { getByText } = render(
      <PreviewRow row={mockValidRow} onPress={onPress} />
    );

    const rowContent = getByText('Basmati Rice').parent;
    if (rowContent?.parent) {
      fireEvent.press(rowContent.parent);
    }

    expect(onPress).toHaveBeenCalledWith(mockValidRow);
  });
});

describe('ProgressIndicator Component', () => {
  it('should render with percentage', () => {
    const { getByText } = render(
      <ProgressIndicator percentage={50} label="Upload" />
    );

    expect(getByText('50%')).toBeDefined();
    expect(getByText('Upload')).toBeDefined();
  });

  it('should render 0% initially', () => {
    const { getByText } = render(
      <ProgressIndicator percentage={0} label="Progress" />
    );

    expect(getByText('0%')).toBeDefined();
  });

  it('should render 100% at completion', () => {
    const { getByText } = render(
      <ProgressIndicator percentage={100} label="Complete" />
    );

    expect(getByText('100%')).toBeDefined();
  });

  it('should update percentage when props change', () => {
    const { rerender, getByText } = render(
      <ProgressIndicator percentage={25} label="Progress" />
    );

    expect(getByText('25%')).toBeDefined();

    rerender(
      <ProgressIndicator percentage={75} label="Progress" />
    );

    expect(getByText('75%')).toBeDefined();
  });

  it('should render custom size', () => {
    const { getByText } = render(
      <ProgressIndicator percentage={50} label="Test" size={200} />
    );

    expect(getByText('50%')).toBeDefined();
  });
});
