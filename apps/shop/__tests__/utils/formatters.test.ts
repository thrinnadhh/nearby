/**
 * Unit tests for formatters utility
 */

import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatTime,
  formatCountdown,
} from '@/utils/formatters';

describe('formatCurrency', () => {
  it('formats paise to rupee string with ₹ symbol', () => {
    expect(formatCurrency(100000)).toContain('₹');
    expect(formatCurrency(100000)).toContain('1,000');
  });

  it('handles zero paise', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('converts paise correctly (100 paise = ₹1)', () => {
    const result = formatCurrency(100);
    expect(result).toBe('₹1');
  });

  it('handles decimal rupees', () => {
    const result = formatCurrency(150);
    expect(result).toContain('1.5');
  });
});

describe('formatCountdown', () => {
  it('formats milliseconds to MM:SS string', () => {
    expect(formatCountdown(180000)).toBe('3:00');
    expect(formatCountdown(90000)).toBe('1:30');
    expect(formatCountdown(65000)).toBe('1:05');
  });

  it('formats zero as 0:00', () => {
    expect(formatCountdown(0)).toBe('0:00');
  });

  it('clamps negative values to 0:00', () => {
    expect(formatCountdown(-1000)).toBe('0:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatCountdown(9000)).toBe('0:09');
  });
});

describe('formatDateTime', () => {
  it('returns a non-empty string for valid ISO date', () => {
    const result = formatDateTime('2026-04-18T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDate', () => {
  it('returns a non-empty string for valid ISO date', () => {
    const result = formatDate('2026-04-18T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result).toContain('2026');
  });
});

describe('formatTime', () => {
  it('returns a non-empty string for valid ISO date', () => {
    const result = formatTime('2026-04-18T10:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
