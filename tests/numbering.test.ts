import { describe, it, expect } from 'vitest';
import { formatInvoiceNumber } from '../src/domain/numbering.js';

describe('Invoice Numbering', () => {
  it('pads sequence numbers with leading zeros', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001');
    expect(formatInvoiceNumber(42)).toBe('INV-0042');
    expect(formatInvoiceNumber(9999)).toBe('INV-9999');
    expect(formatInvoiceNumber(10000)).toBe('INV-10000');
  });

  it('supports custom prefixes', () => {
    expect(formatInvoiceNumber(5, 'BILL')).toBe('BILL-0005');
  });

  it('rejects invalid sequence numbers', () => {
    expect(() => formatInvoiceNumber(0)).toThrow();
    expect(() => formatInvoiceNumber(-5)).toThrow();
    expect(() => formatInvoiceNumber(1.5)).toThrow();
  });
});
