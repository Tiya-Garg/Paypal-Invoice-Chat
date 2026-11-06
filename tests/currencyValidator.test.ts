import { describe, it, expect } from 'vitest';
import { validateCurrencyCode } from '../src/domain/currencyValidator.js';
import { MoneyArithmeticError } from '../src/domain/money.js';

describe('Currency Code Validator', () => {
  it('normalizes valid lowercase currency codes to uppercase', () => {
    expect(validateCurrencyCode('usd')).toBe('USD');
    expect(validateCurrencyCode('inr')).toBe('INR');
    expect(validateCurrencyCode('eur')).toBe('EUR');
  });

  it('rejects unsupported currency strings with descriptive error', () => {
    expect(() => validateCurrencyCode('BTC')).toThrow(MoneyArithmeticError);
    expect(() => validateCurrencyCode('FAKE')).toThrow(MoneyArithmeticError);
  });
});

