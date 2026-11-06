import { describe, it, expect } from 'vitest';
import { validateBasisPoints } from '../src/domain/bpsValidator.js';
import { MoneyArithmeticError } from '../src/domain/money.js';

describe('Basis Points Validator', () => {
  it('accepts valid basis points between 0 and 10000', () => {
    expect(validateBasisPoints(0n)).toBe(0n);
    expect(validateBasisPoints(1800n)).toBe(1800n);
    expect(validateBasisPoints(10000n)).toBe(10000n);
  });

  it('rejects basis points under 0 or over 10000', () => {
    expect(() => validateBasisPoints(-1n)).toThrow(MoneyArithmeticError);
    expect(() => validateBasisPoints(10001n)).toThrow(MoneyArithmeticError);
  });
});

