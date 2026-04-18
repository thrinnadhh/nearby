/**
 * ProductCard component tests
 * Tests for product card rendering, interactions, and stock display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductCard } from '@/components/product/ProductCard';
import * as useProductToggleModule from '@/hooks/useProductToggle';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock useProductToggle hook to prevent store issues
jest.mock('@/hooks/useProductToggle', () => ({
  useProductToggle: jest.fn(),
}));

const mockProduct = {
  id: 'prod-1',
  shopId: 'shop-1',
  name: 'Fresh Tomatoes',
  description: 'Organic tomatoes',
  category: 'Vegetables',
  price: 3000,
  stockQty: 15,
  images: [
    { id: 'img-1', productId: 'prod-1', url: 'https://example.com/tomato.jpg', isPrimary: true, uploadedAt: '2026-04-17T10:00:00Z' },
  ],
  createdAt: '2026-04-17T10:00:00Z',
  updatedAt: '2026-04-17T10:00:00Z',
  isActive: true,
  isAvailable: true,
};

const mockLowStockProduct = {
  ...mockProduct,
  id: 'prod-2',
  name: 'Low Stock Item',
  stockQty: 3,
};

const mockOutOfStockProduct = {
  ...mockProduct,
  id: 'prod-3',
  name: 'Out of Stock Item',
  stockQty: 0,
  isAvailable: false,
};

describe('ProductCard', () => {
  const mockOnPress = jest.fn();
  const mockOnDelete = jest.fn();
  const mockToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock useProductToggle to return a function that doesn't cause issues
    (useProductToggleModule.useProductToggle as jest.Mock).mockReturnValue({
      toggle: mockToggle,
      isLoading: false,
      error: null,
      state: 'idle',
      reset: jest.fn(),
    });
  });

  test('renders product name', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    expect(screen.getByText('Fresh Tomatoes')).toBeTruthy();
  });

  test('renders product price in rupees', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // Price is 3000 paise = ₹30
    expect(screen.getByText('₹30')).toBeTruthy();
  });

  test('renders product image', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    expect(screen.getByTestId('product-image-prod-1')).toBeTruthy();
  });

  test('calls onPress when card is pressed', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    const card = screen.getByTestId('product-card-prod-1');
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalledWith(mockProduct.id);
  });

  test('shows delete button', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // The actual testID rendered is 'delete-button-prod-1'
    const deleteButton = screen.getByTestId('delete-button-prod-1');
    expect(deleteButton).toBeTruthy();
  });

  test('calls onDelete when delete button is pressed and confirmed', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    const deleteButton = screen.getByTestId('delete-button-prod-1');
    fireEvent.press(deleteButton);

    // Alert should be shown
    expect(Alert.alert).toHaveBeenCalled();
    
    // Get the alert callback and trigger delete
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const deleteOption = alertCall[2].find((opt: any) => opt.text === 'Delete');
    deleteOption.onPress();

    expect(mockOnDelete).toHaveBeenCalledWith(mockProduct.id);
  });

  test('shows stock badge for in-stock product', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // Should show stock count badge
    expect(screen.getByTestId('stock-badge-prod-1')).toBeTruthy();
  });

  test('shows low stock badge for products with <10 stock', () => {
    render(
      <ProductCard
        product={mockLowStockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // Should show stock badge for low stock product
    expect(screen.getByTestId('stock-badge-prod-2')).toBeTruthy();
  });

  test('shows out of stock badge for products with 0 stock', () => {
    render(
      <ProductCard
        product={mockOutOfStockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // Should show stock badge for out of stock product
    expect(screen.getByTestId('stock-badge-prod-3')).toBeTruthy();
  });

  test('shows toggle button for availability', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    // The actual testID is 'product-toggle-card-prod-1'
    const toggleButton = screen.getByTestId('product-toggle-card-prod-1');
    expect(toggleButton).toBeTruthy();
  });

  test('calls toggle function when toggle button is pressed', async () => {
    const { getByTestId } = render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    const toggleButton = getByTestId('product-toggle-card-prod-1');
    fireEvent.press(toggleButton);

    expect(mockToggle).toHaveBeenCalled();
  });

  test('displays edit button', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDeletePress={mockOnDelete}
      />
    );
    const editButton = screen.getByTestId('edit-button-prod-1');
    expect(editButton).toBeTruthy();
  });
});
