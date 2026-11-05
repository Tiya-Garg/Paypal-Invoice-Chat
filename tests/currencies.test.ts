import { describe, it, expect } from 'vitest';
import { isSupportedCurrency, SUPPORTED_CURRENCIES } from '../src/domain/currencies.js';

describe('Currencies validation', () => {
  it('validates standard supported currencies', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
    expect(isSupportedCurrency('INR')).toBe(true);
    expect(isSupportedCurrency('EUR')).toBe(true);
    expect(isSupportedCurrency('XYZ')).toBe(false);
  });

  it('exposes list of supported currencies', () => {
    expect(SUPPORTED_CURRENCIES).toContain('USD');
    expect(SUPPORTED_CURRENCIES).toContain('INR');
  });
});
