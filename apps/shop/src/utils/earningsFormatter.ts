/**
 * Earnings formatter utilities
 * Converts paise to rupees, formats dates, calculates trends
 */

/**
 * Format paise (integer) to INR rupees string with ₹ symbol
 * Uses Indian numbering format (₹99,99,999.99)
 * @param paise - Amount in paise (100 paise = ₹1)
 * @returns Formatted string like "₹1,23,456.78"
 */
export function formatCurrencyIndian(paise: number): string {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '₹0.00';
  }

  const rupees = Math.abs(paise) / 100;
  const isNegative = paise < 0;

  // Use toLocaleString with en-IN for Indian numbering
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = isNegative ? '-' : '';
  return `${sign}₹${formatted}`;
}

/**
 * Calculate percentage change between current and previous values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (-100 to 100+)
 */
export function calculateTrendPercent(
  current: number,
  previous: number
): number {
  if (previous === 0 || previous === null) {
    return 0;
  }

  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10; // Round to 1 decimal place
}

/**
 * Get trend indicator (up/down/neutral)
 * @param percent - Percentage change
 * @returns 'up' | 'down' | 'neutral'
 */
export function getTrendIndicator(
  percent: number
): 'up' | 'down' | 'neutral' {
  if (percent > 0) return 'up';
  if (percent < 0) return 'down';
  return 'neutral';
}

/**
 * Format date as "D MMM" (e.g., "19 Apr")
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format date as "D MMM YYYY" (e.g., "19 Apr 2026")
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export function formatDateLong(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00Z`);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get human-readable label for trend percent
 * @param percent - Percentage change
 * @returns Label like "+15%", "-8%", "No change"
 */
export function formatTrendLabel(percent: number): string {
  if (percent === 0) return 'No change';
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}

/**
 * Format seconds to human-readable time
 * @param seconds - Time in seconds
 * @returns Formatted string like "2h 30m", "45m", "30s"
 */
export function formatSeconds(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return '—';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${secs}s`;
}
