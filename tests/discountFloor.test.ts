import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotals } from '../src/domain/calculator.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Fixed Amount Discount Floor', () => {
  it('caps fixed discount at subtotal to prevent negative invoice totals', () => {
    const inv: Invoice = {
      id: 'inv-disc-cap',
      number: 'INV-DISC-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item 1', unitMinor: 5000n, qtyMilli: 1000n }], // $50.00
      discount: { kind: 'amount', amountMinor: 10000n }, // $100.00 fixed discount (exceeds $50 subtotal)
      tax: null,
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
    expect(totals.subtotalMinor).toBe(5000n);
    expect(totals.discountMinor).toBe(5000n); // Capped at subtotal
    expect(totals.totalMinor).toBe(0n); // Never negative
  });
});

