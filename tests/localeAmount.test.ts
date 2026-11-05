import { describe, it, expect } from 'vitest';
import { parseLocaleAmount } from '../src/llm/localeAmount.js';

describe('Locale Amount Parser', () => {
  it('parses k suffixes correctly', () => {
    expect(parseLocaleAmount('5k').amountMinor).toBe(500000n);
    expect(parseLocaleAmount('$5k').amountMinor).toBe(500000n);
    expect(parseLocaleAmount('1.5k').amountMinor).toBe(150000n);
    expect(parseLocaleAmount('0.5k').amountMinor).toBe(50000n);
  });

  it('parses lakh and L representations', () => {
    expect(parseLocaleAmount('1.5L').amountMinor).toBe(15000000n); // 150,000 * 100
    expect(parseLocaleAmount('2 lakh').amountMinor).toBe(20000000n);
    expect(parseLocaleAmount('₹1.5 lakh').amountMinor).toBe(15000000n);
  });

  it('detects currency symbols and text keywords', () => {
    expect(parseLocaleAmount('₹5,000').currency).toBe('INR');
    expect(parseLocaleAmount('5000 rupees').currency).toBe('INR');
    expect(parseLocaleAmount('$5k').currency).toBe('USD');
    expect(parseLocaleAmount('5000 dollars').currency).toBe('USD');
    expect(parseLocaleAmount('100 euros').currency).toBe('EUR');
  });

  it('handles standard commas and decimals', () => {
    expect(parseLocaleAmount('5,000').amountMinor).toBe(500000n);
    expect(parseLocaleAmount('5,500.50').amountMinor).toBe(550050n);
    expect(parseLocaleAmount('12.00').amountMinor).toBe(1200n);
  });
});

