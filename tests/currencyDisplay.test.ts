import { describe, it, expect } from 'vitest';
import { getCurrencyConfig, formatCurrencyAmount } from '../src/domain/currencyDisplay.js';

describe('Currency Display & Formatting Suite', () => {
  it('correctly maps all supported currency codes to proper symbols and locales', () => {
    expect(getCurrencyConfig('USD')).toEqual({
      code: 'USD',
      symbol: '$',
      fractionDigits: 2,
      locale: 'en-US',
    });

    expect(getCurrencyConfig('EUR').symbol).toBe('€');
    expect(getCurrencyConfig('GBP').symbol).toBe('£');
    expect(getCurrencyConfig('INR').symbol).toBe('₹');
  });

  it('falls back to USD configuration for unknown currencies or empty inputs', () => {
    const fallback = getCurrencyConfig('XYZ');
    expect(fallback.code).toBe('USD');
    expect(fallback.symbol).toBe('$');

    const emptyFallback = getCurrencyConfig('');
    expect(emptyFallback.code).toBe('USD');
  });

  it('formats minor amounts correctly across locales', () => {
    // 5000 USD minor = $50.00
    const formattedUsd = formatCurrencyAmount(5000n, 'USD');
    expect(formattedUsd).toContain('50.00');

    // 150000 INR minor = ₹1,500.00
    const formattedInr = formatCurrencyAmount(150000n, 'INR');
    expect(formattedInr).toContain('1,500.00');
  });
});
