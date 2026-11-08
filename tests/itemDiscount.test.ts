import { describe, it, expect } from 'vitest';
import { calculateItemDiscountMinor } from '../src/domain/itemDiscount.js';

describe('Item Discount Calculation Suite', () => {
  it('returns 0n for null, undefined, or zero discounts', () => {
    expect(calculateItemDiscountMinor(1000n, 1000n, null)).toBe(0n);
    expect(calculateItemDiscountMinor(1000n, 1000n, undefined)).toBe(0n);
    expect(calculateItemDiscountMinor(1000n, 1000n, { type: 'percent', value: 0 })).toBe(0n);
    expect(calculateItemDiscountMinor(1000n, 1000n, { type: 'fixed', value: -50 })).toBe(0n);
  });

  it('calculates percentage basis points discounts correctly', () => {
    // 100.00 unit price, qty 1, 1000 bps (10%) = 10.00
    const res = calculateItemDiscountMinor(10000n, 1000n, { type: 'percent', value: 1000 });
    expect(res).toBe(1000n);

    // 50.00 unit price, qty 2.5 (= 125.00 gross), 2000 bps (20%) = 25.00
    const res2 = calculateItemDiscountMinor(5000n, 2500n, { type: 'percent', value: 2000 });
    expect(res2).toBe(2500n);
  });

  it('calculates fixed amount discounts correctly', () => {
    // 100.00 gross, 15.00 fixed discount (1500 minor)
    const res = calculateItemDiscountMinor(10000n, 1000n, { type: 'fixed', value: 1500 });
    expect(res).toBe(1500n);
  });

  it('caps discount so it never exceeds item gross total', () => {
    // 50.00 gross, fixed discount requested 99.00 -> capped at 5000n
    const res = calculateItemDiscountMinor(5000n, 1000n, { type: 'fixed', value: 9900 });
    expect(res).toBe(5000n);

    // percent > 100% (e.g. 15000 bps) -> capped at 10000 bps (100% of gross)
    const res2 = calculateItemDiscountMinor(5000n, 1000n, { type: 'percent', value: 15000 });
    expect(res2).toBe(5000n);
  });
});
