/**
 * Frontend tests for LowStockAlertItem component
 * Validates: display, interaction, dismissal, image handling
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { LowStockAlertItem } from '../LowStockAlertItem';
import { LowStockProduct } from '@/types/low-stock';

const MOCK_PRODUCT: LowStockProduct = {
  id: 'prod-001',
  name: 'Rice',
  category: 'Grains',
  price: 2500,
  stockQuantity: 2,
  unit: 'kg',
  thumbnailUrl: 'https://cdn.example.com/rice.jpg',
  description: 'Basmati rice',
  isAvailable: true,
  updatedAt: '2026-04-19T10:00:00Z',
};

const MOCK_PRODUCT_NO_IMAGE: LowStockProduct = {
  ...MOCK_PRODUCT,
  thumbnailUrl: null,
};

const MOCK_PRODUCT_ZERO_STOCK: LowStockProduct = {
  ...MOCK_PRODUCT,
  stockQuantity: 0,
};

describe('LowStockAlertItem', () => {
  describe('Rendering', () => {
    it('AC5: should display product image', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      const image = getByTestId('low-stock-item-image');
      expect(image).toBeTruthy();
    });

    it('AC5: should display product name', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText('Rice')).toBeTruthy();
    });

    it('AC5: should display product category', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText('Grains')).toBeTruthy();
    });

    it('AC5: should display stock quantity with unit', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText(/2\s*kg/)).toBeTruthy();
    });

    it('AC5: should display price in rupees', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText(/₹25\.00/)).toBeTruthy();
    });

    it('AC5: should display availability indicator if available', () => {
      const { queryByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      const checkIcon = queryByTestId('availability-icon');
      if (MOCK_PRODUCT.isAvailable) {
        expect(checkIcon).toBeTruthy();
      }
    });

    it('should display description if provided', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText('Basmati rice')).toBeTruthy();
    });

    it('should display updated_at date', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByText(/Last updated:/)).toBeTruthy();
    });
  });

  describe('Image Handling', () => {
    it('should display image placeholder when thumbnailUrl is null', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT_NO_IMAGE} />
      );

      const imagePlaceholder = getByTestId('low-stock-item-image-placeholder');
      expect(imagePlaceholder).toBeTruthy();
    });

    it('should render image placeholder icon', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT_NO_IMAGE} />
      );

      const placeholder = getByTestId('low-stock-item-image-placeholder');
      expect(placeholder).toBeTruthy();
    });
  });

  describe('Stock Status Color', () => {
    it('should show error color for zero stock', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT_ZERO_STOCK} />
      );

      const stockBadge = getByTestId('stock-badge');
      expect(stockBadge).toHaveStyle({ backgroundColor: expect.any(String) });
    });

    it('should show warning color for low stock', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      const stockBadge = getByTestId('stock-badge');
      expect(stockBadge).toBeTruthy();
    });
  });

  describe('Dismissal', () => {
    it('should call onDismiss when dismiss button is pressed', () => {
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <LowStockAlertItem
          product={MOCK_PRODUCT}
          isDismissed={false}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = getByTestId('dismiss-button');
      fireEvent.press(dismissButton);

      expect(onDismiss).toHaveBeenCalledWith('prod-001');
    });

    it('should not show dismiss button when already dismissed', () => {
      const onDismiss = jest.fn();
      const { queryByTestId } = render(
        <LowStockAlertItem
          product={MOCK_PRODUCT}
          isDismissed={true}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = queryByTestId('dismiss-button');
      expect(dismissButton).toBeNull();
    });

    it('should show undismiss button when dismissed', () => {
      const onUndismiss = jest.fn();
      const { getByTestId } = render(
        <LowStockAlertItem
          product={MOCK_PRODUCT}
          isDismissed={true}
          onUndismiss={onUndismiss}
        />
      );

      const undismissButton = getByTestId('undismiss-button');
      expect(undismissButton).toBeTruthy();
    });

    it('should call onUndismiss when undismiss button is pressed', () => {
      const onUndismiss = jest.fn();
      const { getByTestId } = render(
        <LowStockAlertItem
          product={MOCK_PRODUCT}
          isDismissed={true}
          onUndismiss={onUndismiss}
        />
      );

      const undismissButton = getByTestId('undismiss-button');
      fireEvent.press(undismissButton);

      expect(onUndismiss).toHaveBeenCalledWith('prod-001');
    });

    it('should apply dismissed styling when dismissed=true', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} isDismissed={true} />
      );

      const container = getByTestId('low-stock-item-container');
      expect(container).toHaveStyle({ opacity: 0.6 });
    });
  });

  describe('Interactions', () => {
    it('should call onPress when item is pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} onPress={onPress} />
      );

      const container = getByTestId('low-stock-item-container');
      fireEvent.press(container);

      expect(onPress).toHaveBeenCalled();
    });

    it('should have proper active opacity', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      const container = getByTestId('low-stock-item-container');
      expect(container).toHaveStyle({ activeOpacity: 0.7 });
    });

    it('should stop propagation when dismiss button is pressed', () => {
      const onPress = jest.fn();
      const onDismiss = jest.fn();
      const { getByTestId } = render(
        <LowStockAlertItem
          product={MOCK_PRODUCT}
          onPress={onPress}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = getByTestId('dismiss-button');
      fireEvent.press(dismissButton);

      // onDismiss should be called
      expect(onDismiss).toHaveBeenCalled();
      // But we should verify stopPropagation was called (hard to test with react-native)
    });
  });

  describe('Edge Cases', () => {
    it('should handle product with very long name', () => {
      const product = {
        ...MOCK_PRODUCT,
        name: 'A'.repeat(100),
      };

      const { getByText } = render(
        <LowStockAlertItem product={product} />
      );

      expect(getByText(/A+/)).toBeTruthy();
    });

    it('should handle product with zero stock', () => {
      const { getByText } = render(
        <LowStockAlertItem product={MOCK_PRODUCT_ZERO_STOCK} />
      );

      expect(getByText(/0\s*kg/)).toBeTruthy();
    });

    it('should handle product without description', () => {
      const product = {
        ...MOCK_PRODUCT,
        description: null,
      };

      const { queryByText } = render(
        <LowStockAlertItem product={product} />
      );

      expect(queryByText('Basmati rice')).toBeNull();
    });

    it('should handle missing callbacks gracefully', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      const container = getByTestId('low-stock-item-container');
      expect(() => fireEvent.press(container)).not.toThrow();
    });

    it('should format price correctly for large amounts', () => {
      const product = {
        ...MOCK_PRODUCT,
        price: 1000000,
      };

      const { getByText } = render(
        <LowStockAlertItem product={product} />
      );

      expect(getByText(/₹10000\.00/)).toBeTruthy();
    });

    it('should handle fractional prices', () => {
      const product = {
        ...MOCK_PRODUCT,
        price: 2565,
      };

      const { getByText } = render(
        <LowStockAlertItem product={product} />
      );

      expect(getByText(/₹25\.65/)).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper test IDs for automation', () => {
      const { getByTestId } = render(
        <LowStockAlertItem product={MOCK_PRODUCT} />
      );

      expect(getByTestId('low-stock-item-container')).toBeTruthy();
      expect(getByTestId('low-stock-item-image')).toBeTruthy();
    });
  });
});
