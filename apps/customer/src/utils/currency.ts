/**
 * Format a paise (integer) value as a rupee string.
 * e.g. 2500 → "₹25.00"
 */
export function paise(amount: number): string {
  return `₹${(amount / 100).toFixed(2)}`;
}
