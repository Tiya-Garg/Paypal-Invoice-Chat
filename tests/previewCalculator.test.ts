import { describe, it, expect } from 'vitest';
import { calculatePreviewTotals } from '../public/previewCalculator.js';

describe('calculatePreviewTotals client math', () => {
  it('calculates subtotal and tax accurately without discount', () => {
    const res = calculatePreviewTotals(
      [
        { qty: 2, unitPrice: 50 },
        { qty: 1, unitPrice: 100 },
      ],
      1000, // 10%
      null,
    );

    expect(res.subtotal).toBe(200);
    expect(res.discountAmount).toBe(0);
    expect(res.taxableAmount).toBe(200);
    expect(res.taxAmount).toBe(20);
    expect(res.total).toBe(220);
  });

  it('caps discount amount at subtotal to prevent negative totals', () => {
    const res = calculatePreviewTotals(
      [{ qty: 1, unitPrice: 50 }],
      1000,
      { kind: 'amount', amount: 150 },
    );

    expect(res.subtotal).toBe(50);
    expect(res.discountAmount).toBe(50);
    expect(res.taxableAmount).toBe(0);
    expect(res.taxAmount).toBe(0);
    expect(res.total).toBe(0);
  });
});
