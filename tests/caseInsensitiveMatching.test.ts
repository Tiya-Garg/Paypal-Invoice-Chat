import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Case-Insensitive Matching', () => {
  it('matches descriptions regardless of casing', () => {
    const inv: Invoice = {
      id: 'inv-case',
      number: 'INV-CASE-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Heavy Machinery Rental', unitMinor: 100000n, qtyMilli: 1000n }],
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
      { op: 'update_item', match: 'heavy machinery rental', unitPrice: 1200 },
    ]);

    expect(updatedInvoice.items[0]?.unitMinor).toBe(120000n);
  });
});

