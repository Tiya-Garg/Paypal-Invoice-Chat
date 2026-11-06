import { describe, it, expect } from 'vitest';
import { validateItemPosition } from '../src/domain/positionValidator.js';

describe('Item Position Validator', () => {
  it('accepts zero and positive integers', () => {
    expect(validateItemPosition(0)).toBe(0);
    expect(validateItemPosition(5)).toBe(5);
  });

  it('rejects negative numbers or floats', () => {
    expect(() => validateItemPosition(-1)).toThrow();
    expect(() => validateItemPosition(1.5)).toThrow();
  });
});

