import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item Exact Description Priority', () => {
  it('prioritizes exact description match over partial substring match', () => {
    const inv: Invoice = {
      id: 'inv-desc-prio',
      number: 'INV-DESC-PRIO-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [
        { id: '1', description: 'Wood', unitMinor: 1000n, qtyMilli: 1000n },
        { id: '2', description: 'Wood Screws and Fasteners', unitMinor: 2000n, qtyMilli: 1000n },
      ],
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
      { op: 'update_item', match: 'Wood', unitPrice: 15 },
    ]);

    expect(updatedInvoice.items[0]?.unitMinor).toBe(1500n); // Exact "Wood" matched!
    expect(updatedInvoice.items[1]?.unitMinor).toBe(2000n); // Untouched
  });
});

