import { describe, it, expect } from 'vitest';
import { parseLocaleAmount } from '../src/llm/localeAmount.js';

describe('INR and USD Precision Boundary Values', () => {
  it('parses large multi-lakh amounts into paise', () => {
    // 50 lakh = 5,000,000 rupees = 500,000,000 paise
    const res = parseLocaleAmount('50 lakh', 'INR');
    expect(res.amountMinor).toBe(500000000n);
    expect(res.currency).toBe('INR');
  });

  it('parses single cent amounts accurately without underflow', () => {
    const res = parseLocaleAmount('0.01', 'USD');
    expect(res.amountMinor).toBe(1n);
  });
});
