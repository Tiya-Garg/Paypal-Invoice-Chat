import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals } from '../src/domain/calculator.js';
import type { Invoice } from '../src/domain/types.js';

describe('PayPal Tax and Discount Order Invariants', () => {
  it('applies discount before tax on invoice totals', () => {
    const inv: Invoice = {
      id: 'inv-tax-order',
      number: 'INV-TAX-01',
      currency: 'USD',
      firmName: 'Firm',
      firmEmail: 'a@b.com',
      items: [
        { id: '1', description: 'Item A', unitMinor: 10000n, qtyMilli: 1000n }, // $100.00
      ],
      discount: { kind: 'percent', percentBps: 2000n }, // 20% = $20.00 discount -> $80.00 taxable
      tax: { name: 'GST', percentBps: 1000n }, // 10% on $80.00 = $8.00 tax
      dueDays: 15,
      note: null,
      status: 'DRAFT',
      version: 1,
      paypalInvoiceId: null,
      paypalStatus: null,
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const totals = calculateInvoiceTotals(inv);

    expect(totals.subtotalMinor).toBe(10000n);
    expect(totals.discountMinor).toBe(2000n);
    expect(totals.taxMinor).toBe(800n);
    expect(totals.totalMinor).toBe(8800n); // $88.00 total (never taxed on undiscounted $100)
  });
});

