import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Fixed Amount Discount Application', () => {
  it('applies fixed minor unit discount accurately', () => {
    const inv: Invoice = {
      id: 'inv-flat-disc',
      number: 'INV-FLAT-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item A', unitMinor: 10000n, qtyMilli: 1000n }], // $100.00
      tax: null,
      discount: null,
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

    const { updatedInvoice } = applyOps(inv, [
      { op: 'set_discount', kind: 'amount', value: 15 }, // $15.00
    ]);

    expect(updatedInvoice.discount?.kind).toBe('amount');
    if (updatedInvoice.discount?.kind === 'amount') {
      expect(updatedInvoice.discount.amountMinor).toBe(1500n);
    }
  });
});
