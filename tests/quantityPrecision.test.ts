import { describe, it, expect } from 'vitest';
import { toQtyMilli, toPayPalQuantity, MoneyArithmeticError } from '../src/domain/money.js';

describe('3-Decimal Quantity Edge Cases', () => {
  it('parses fractional quantities accurately up to 3 decimal places', () => {
    expect(toQtyMilli('0.001')).toBe(1n);
    expect(toQtyMilli('0.100')).toBe(100n);
    expect(toQtyMilli('3.333')).toBe(3333n);
    expect(toPayPalQuantity(3333n)).toBe('3.333');
    expect(toPayPalQuantity(1n)).toBe('0.001');
  });

  it('rejects quantities with more than 3 decimal places or non-positive values', () => {
    expect(() => toQtyMilli('1.2345')).toThrow(MoneyArithmeticError);
    expect(() => toQtyMilli('0')).toThrow(MoneyArithmeticError);
    expect(() => toQtyMilli('-1')).toThrow(MoneyArithmeticError);
  });
});

