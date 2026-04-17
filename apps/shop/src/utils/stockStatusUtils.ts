/**
 * Stock status utility functions
 * Determines badge color, icon, and text based on stock quantity
 */

import { colors } from '@/constants/theme';

/**
 * Stock status type
 */
export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

/**
 * Stock badge appearance based on status
 */
export interface StockBadgeAppearance {
  status: StockStatus;
  displayText: string;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  iconName: string;
}

/**
 * Calculate stock status based on quantity and threshold
 * @param stockQty - current stock quantity
 * @param threshold - default 5, quantity at or below this is "low stock"
 * @returns stock status ('in-stock' | 'low-stock' | 'out-of-stock')
 */
export function getStockStatus(
  stockQty: number,
  threshold: number = 5
): StockStatus {
  if (stockQty === 0) {
    return 'out-of-stock';
  }
  if (stockQty <= threshold) {
    return 'low-stock';
  }
  return 'in-stock';
}

/**
 * Get badge appearance (colors, icons, text) for stock status
 * @param stockQty - current stock quantity
 * @param threshold - default 5
 * @returns badge appearance object with colors and icon name
 */
export function getStockBadgeAppearance(
  stockQty: number,
  threshold: number = 5
): StockBadgeAppearance {
  const status = getStockStatus(stockQty, threshold);

  const baseConfig = {
    in_stock: {
      displayText: `In Stock (${stockQty})`,
      backgroundColor: colors.success,
      textColor: colors.white,
      iconColor: colors.white,
      iconName: 'package-check',
    },
    low_stock: {
      displayText: `Low Stock (${stockQty})`,
      backgroundColor: colors.warning,
      textColor: colors.textPrimary,
      iconColor: colors.textPrimary,
      iconName: 'package-down',
    },
    out_of_stock: {
      displayText: 'Out of Stock',
      backgroundColor: colors.error,
      textColor: colors.white,
      iconColor: colors.white,
      iconName: 'package-remove',
    },
  };

  const config =
    status === 'in-stock'
      ? baseConfig.in_stock
      : status === 'low-stock'
        ? baseConfig.low_stock
        : baseConfig.out_of_stock;

  return {
    status,
    ...config,
  };
}

/**
 * Check if product should be visually highlighted as low stock
 * @param stockQty - current stock quantity
 * @param threshold - default 5
 * @returns true if stock is low (1-5)
 */
export function isLowStock(stockQty: number, threshold: number = 5): boolean {
  return stockQty > 0 && stockQty <= threshold;
}

/**
 * Check if product is completely out of stock
 * @param stockQty - current stock quantity
 * @returns true if stock is 0
 */
export function isOutOfStock(stockQty: number): boolean {
  return stockQty === 0;
}

/**
 * Get stock status label for display
 * @param stockQty - current stock quantity
 * @returns human-readable label
 */
export function getStockStatusLabel(stockQty: number): string {
  if (stockQty === 0) {
    return 'Out of Stock';
  }
  if (stockQty <= 5) {
    return `Low Stock (${stockQty})`;
  }
  return `In Stock (${stockQty})`;
}
