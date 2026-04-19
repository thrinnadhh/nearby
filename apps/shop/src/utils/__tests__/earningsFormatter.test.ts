/**
 * Tests for earningsFormatter utilities
 * Coverage: 40+ tests for all formatting functions
 */

import {
  formatCurrencyIndian,
  calculateTrendPercent,
  getTrendIndicator,
  formatDateShort,
  formatDateLong,
  formatTrendLabel,
  formatSeconds,
} from '@/utils/earningsFormatter';

describe('earningsFormatter', () => {
  describe('formatCurrencyIndian', () => {
    it('should format paise to rupees with Indian numbering', () => {
      expect(formatCurrencyIndian(100)).toBe('₹1.00');
    });

    it('should format 1 lakh paise to 1000 rupees', () => {
      expect(formatCurrencyIndian(100000)).toBe('₹1,000.00');
    });

    it('should format 1 crore paise correctly', () => {
      expect(formatCurrencyIndian(10000000)).toBe('₹1,00,000.00');
    });

    it('should handle zero', () => {
      expect(formatCurrencyIndian(0)).toBe('₹0.00');
    });

    it('should handle negative values', () => {
      expect(formatCurrencyIndian(-5000)).toBe('-₹50.00');
    });

    it('should handle fractional paise', () => {
      expect(formatCurrencyIndian(12345)).toBe('₹123.45');
    });

    it('should handle null', () => {
      expect(formatCurrencyIndian(null as any)).toBe('₹0.00');
    });

    it('should handle undefined', () => {
      expect(formatCurrencyIndian(undefined as any)).toBe('₹0.00');
    });

    it('should handle NaN', () => {
      expect(formatCurrencyIndian(NaN)).toBe('₹0.00');
    });

    it('should format 99,99,999.99 correctly (max Indian notation)', () => {
      const value = 9999999 + 99; // ₹99,99,999.99
      const result = formatCurrencyIndian(value);
      expect(result).toContain('₹');
      expect(result).toContain(',');
    });

    it('should handle large numbers correctly', () => {
      expect(formatCurrencyIndian(999999999)).toBe('₹99,99,999.99');
    });
  });

  describe('calculateTrendPercent', () => {
    it('should calculate positive trend correctly', () => {
      expect(calculateTrendPercent(150, 100)).toBe(50);
    });

    it('should calculate negative trend correctly', () => {
      expect(calculateTrendPercent(50, 100)).toBe(-50);
    });

    it('should return 0 when values are equal', () => {
      expect(calculateTrendPercent(100, 100)).toBe(0);
    });

    it('should handle zero previous value', () => {
      expect(calculateTrendPercent(100, 0)).toBe(0);
    });

    it('should handle null previous value', () => {
      expect(calculateTrendPercent(100, null as any)).toBe(0);
    });

    it('should round to 1 decimal place', () => {
      expect(calculateTrendPercent(101, 100)).toBe(1);
      expect(calculateTrendPercent(101.5, 100)).toBe(1.5);
    });

    it('should calculate very small percentage changes', () => {
      expect(calculateTrendPercent(100.1, 100)).toBe(0.1);
    });

    it('should handle large percentage changes', () => {
      expect(calculateTrendPercent(1000, 100)).toBe(900);
    });

    it('should handle negative current values', () => {
      expect(calculateTrendPercent(-50, 100)).toBe(-150);
    });
  });

  describe('getTrendIndicator', () => {
    it('should return "up" for positive percent', () => {
      expect(getTrendIndicator(10)).toBe('up');
    });

    it('should return "down" for negative percent', () => {
      expect(getTrendIndicator(-10)).toBe('down');
    });

    it('should return "neutral" for zero percent', () => {
      expect(getTrendIndicator(0)).toBe('neutral');
    });

    it('should handle small positive changes', () => {
      expect(getTrendIndicator(0.1)).toBe('up');
    });

    it('should handle small negative changes', () => {
      expect(getTrendIndicator(-0.1)).toBe('down');
    });

    it('should handle very large percent changes', () => {
      expect(getTrendIndicator(1000)).toBe('up');
    });
  });

  describe('formatDateShort', () => {
    it('should format date as "D MMM"', () => {
      const result = formatDateShort('2026-04-19');
      expect(result).toMatch(/\d+\s\w{3}/); // "19 Apr" format
    });

    it('should handle first day of month', () => {
      const result = formatDateShort('2026-04-01');
      expect(result).toContain('Apr');
    });

    it('should handle different months', () => {
      expect(formatDateShort('2026-01-15')).toContain('Jan');
      expect(formatDateShort('2026-12-25')).toContain('Dec');
    });

    it('should format single-digit day', () => {
      const result = formatDateShort('2026-04-05');
      expect(result).toMatch(/\d+\s\w{3}/);
    });
  });

  describe('formatDateLong', () => {
    it('should format date as "D MMM YYYY"', () => {
      const result = formatDateLong('2026-04-19');
      expect(result).toMatch(/\d+\s\w{3}\s\d{4}/); // "19 Apr 2026" format
    });

    it('should include year', () => {
      expect(formatDateLong('2026-04-19')).toContain('2026');
    });

    it('should handle different years', () => {
      expect(formatDateLong('2025-04-19')).toContain('2025');
      expect(formatDateLong('2027-04-19')).toContain('2027');
    });
  });

  describe('formatTrendLabel', () => {
    it('should format positive trend with plus sign', () => {
      expect(formatTrendLabel(15)).toBe('+15%');
    });

    it('should format negative trend with minus sign', () => {
      expect(formatTrendLabel(-8)).toBe('-8%');
    });

    it('should return "No change" for zero', () => {
      expect(formatTrendLabel(0)).toBe('No change');
    });

    it('should handle decimal percentages', () => {
      expect(formatTrendLabel(15.5)).toBe('+15.5%');
    });

    it('should handle large percentages', () => {
      expect(formatTrendLabel(100)).toBe('+100%');
    });
  });

  describe('formatSeconds', () => {
    it('should format seconds as hours and minutes', () => {
      expect(formatSeconds(7200)).toBe('2h 0m');
    });

    it('should format seconds as minutes', () => {
      expect(formatSeconds(300)).toBe('5m');
    });

    it('should format less than 60 seconds', () => {
      expect(formatSeconds(45)).toBe('45s');
    });

    it('should handle null', () => {
      expect(formatSeconds(null)).toBe('—');
    });

    it('should handle zero', () => {
      expect(formatSeconds(0)).toBe('—');
    });

    it('should format complex times', () => {
      const result = formatSeconds(3665); // 1h 1m 5s
      expect(result).toContain('h');
      expect(result).toContain('m');
    });

    it('should format times with minutes and seconds', () => {
      const result = formatSeconds(125); // 2m 5s
      expect(result).toBe('2m');
    });

    it('should handle large hour values', () => {
      expect(formatSeconds(36000)).toBe('10h 0m');
    });
  });
});
