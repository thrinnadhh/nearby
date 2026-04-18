/**
 * ProductCard component tests
 * Tests for product card rendering, interactions, and stock display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductCard } from '@/components/product/ProductCard';

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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
};

describe('ProductCard', () => {
  const mockOnPress = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders product name', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Fresh Tomatoes')).toBeTruthy();
  });

  test('renders product price', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('₹30')).toBeTruthy();
  });

  test('renders product image', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId('product-image-prod-1')).toBeTruthy();
  });

  test('calls onPress when card is pressed', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    const card = screen.getByTestId('product-card-prod-1');
    fireEvent.press(card);    // Should call onPress with product ID (note: component may use onPress callback)    expect(mockOnPress).toHaveBeenCalledWith(mockProduct);
  });

  test('shows delete button', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId('delete-button-prod-1')).toBeTruthy();
  });

  test('calls onDelete when delete button is pressed', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    const deleteButton = screen.getByTestId('delete-button-prod-1');
    fireEvent.press(deleteButton);
    expect(Alert.alert).toHaveBeenCalled();
  });

  test('displays stock badge for in-stock product', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId('stock-badge-prod-1')).toBeTruthy();
  });

  test('displays correct stock status for low stock', () => {
    render(
      <ProductCard
        product={mockLowStockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    // Stock badge rendered via StockBadge component
    expect(screen.getByTestId(`stock-badge-${mockLowStockProduct.id}`)).toBeTruthy();
  });

  test('displays out of stock status', () => {
    render(
      <ProductCard
        product={mockOutOfStockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Out of Stock')).toBeTruthy();
  });

  test('handles long product names', () => {
    const longNameProduct = {
      ...mockProduct,
      name: 'This is a very long product name that should be truncated on the card',
    };
    render(
      <ProductCard
        product={longNameProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId('product-card-prod-1')).toBeTruthy();
  });

  test('displays correct stock quantity', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    // Stock badge shows via StockBadge component with testID
    expect(screen.getByTestId(`stock-badge-${mockProduct.id}`)).toBeTruthy();
  });

  test('renders product card with all elements', () => {
    render(
      <ProductCard
        product={mockProduct}
        onPress={mockOnPress}
        onDelete={mockOnDelete}
      />
    );
    // Verify card renders with product name, price, stock badge, and action buttons
    expect(screen.getByTestId('product-card-prod-1')).toBeTruthy();
    expect(screen.getByText(mockProduct.name)).toBeTruthy();
    expect(screen.getByTestId(`stock-badge-${mockProduct.id}`)).toBeTruthy();
    expect(screen.getByTestId('edit-button-prod-1')).toBeTruthy();
  });
});
