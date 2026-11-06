import { describe, it, expect } from 'vitest';
import { formatTotalsBreakdown } from '../src/domain/totalsFormatter.js';

describe('Totals Breakdown Formatter', () => {
  it('formats USD currency breakdown with currency symbols', () => {
    const res = formatTotalsBreakdown(10000n, 1000n, 500n, 9500n, 'USD');
    expect(res.subtotalFormatted).toBe('$100.00');
    expect(res.discountFormatted).toBe('$10.00');
    expect(res.taxFormatted).toBe('$5.00');
    expect(res.totalFormatted).toBe('$95.00');
  });

  it('omits optional discount or tax when zero', () => {
    const res = formatTotalsBreakdown(5000n, 0n, 0n, 5000n, 'USD');
    expect(res.discountFormatted).toBeUndefined();
    expect(res.taxFormatted).toBeUndefined();
    expect(res.totalFormatted).toBe('$50.00');
  });
});
