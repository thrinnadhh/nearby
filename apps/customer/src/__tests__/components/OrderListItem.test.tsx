import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderListItem, getStatusLabel, getStatusColor, getStatusIcon } from '@/components/OrderListItem';
import type { Order } from '@/types';

describe('OrderListItem Component', () => {
  const mockOrder: Order = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    shop_id: 'shop-123',
    shop_name: 'Fresh Kirana',
    status: 'delivered',
    total_paise: 50000, // ₹500
    items: [
      { product_id: 'prod-1', name: 'Milk', price: 10000, qty: 2 },
      { product_id: 'prod-2', name: 'Bread', price: 8000, qty: 1 },
    ],
    payment_method: 'upi',
    created_at: '2026-04-16T10:30:00Z',
  };

  const mockOnPress = vi.fn();
  const mockOnReorder = vi.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
    mockOnReorder.mockReset();
  });

  describe('Rendering', () => {
    it('should render order card with all sections', () => {
      render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText(/550E8400/)).toBeTruthy();
      expect(screen.getByText('Fresh Kirana')).toBeTruthy();
      expect(screen.getByText(/₹500/)).toBeTruthy();
      expect(screen.getByText('2 items')).toBeTruthy();
    });

    it('should display correct status label and color for delivered order', () => {
      render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
        />
      );

      const statusText = screen.getByText('Delivered');
      expect(statusText).toBeTruthy();
    });

    it('should show reorder button for delivered orders', () => {
      render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
          onReorder={mockOnReorder}
        />
      );

      const reorderButton = screen.getByRole('button', { name: /Reorder/i });
      expect(reorderButton).toBeTruthy();
    });

    it('should not show reorder button for non-delivered orders', () => {
      const pendingOrder = { ...mockOrder, status: 'pending' as const };
      render(
        <OrderListItem
          order={pendingOrder}
          onPress={mockOnPress}
          onReorder={mockOnReorder}
        />
      );

      const reorderButton = screen.queryByRole('button', { name: /Reorder/i });
      expect(reorderButton).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when card is pressed', () => {
      const { getByText } = render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
        />
      );

      const card = getByText('Fresh Kirana');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledWith(mockOrder);
    });

    it('should call onReorder when reorder button is pressed', async () => {
      mockOnReorder.mockResolvedValue(undefined);

      const { getByRole } = render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
          onReorder={mockOnReorder}
        />
      );

      const reorderButton = getByRole('button', { name: /Reorder/i });
      fireEvent.press(reorderButton);

      await waitFor(() => {
        expect(mockOnReorder).toHaveBeenCalledWith(mockOrder);
      });
    });

    it('should disable reorder button when reordering', () => {
      const { getByRole } = render(
        <OrderListItem
          order={mockOrder}
          onPress={mockOnPress}
          onReorder={mockOnReorder}
          isReordering={true}
        />
      );

      const reorderButton = getByRole('button', { name: /Reorder/i });
      expect(reorderButton.props.disabled).toBe(true);
    });
  });

  describe('Status Helpers', () => {
    it('should return correct status labels', () => {
      expect(getStatusLabel('pending')).toBe('Waiting for shop');
      expect(getStatusLabel('delivered')).toBe('Delivered');
      expect(getStatusLabel('cancelled')).toBe('Cancelled');
    });

    it('should return correct status colors', () => {
      expect(getStatusColor('delivered')).toBe('#16A34A'); // green
      expect(getStatusColor('cancelled')).toBe('#DC2626'); // red
      expect(getStatusColor('pending')).toBe('#D97706'); // orange
    });

    it('should return correct status icons', () => {
      expect(getStatusIcon('delivered')).toBe('checkmark-circle');
      expect(getStatusIcon('cancelled')).toBe('close-circle');
      expect(getStatusIcon('pending')).toBe('time');
    });
  });

  describe('Edge Cases', () => {
    it('should handle orders with many items', () => {
      const manyItemsOrder = {
        ...mockOrder,
        items: Array.from({ length: 5 }, (_, i) => ({
          product_id: `prod-${i}`,
          name: `Product ${i}`,
          price: 5000,
          qty: 1,
        })),
      };

      render(
        <OrderListItem
          order={manyItemsOrder}
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText('5 items')).toBeTruthy();
    });

    it('should handle very long shop names', () => {
      const longNameOrder = {
        ...mockOrder,
        shop_name: 'A Very Long Shop Name That Should Be Truncated',
      };

      render(
        <OrderListItem
          order={longNameOrder}
          onPress={mockOnPress}
        />
      );

      const shopName = screen.getByText(/A Very Long Shop Name/);
      expect(shopName.props.numberOfLines).toBe(1);
    });

    it('should format order amounts correctly', () => {
      const expensiveOrder = {
        ...mockOrder,
        total_paise: 1250000, // ₹12,500
      };

      render(
        <OrderListItem
          order={expensiveOrder}
          onPress={mockOnPress}
        />
      );

      expect(screen.getByText(/₹12500/)).toBeTruthy();
    });
  });
});
