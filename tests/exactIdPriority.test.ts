import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item Exact ID Lookup Priority', () => {
  it('prioritizes exact item ID over description substring', () => {
    const inv: Invoice = {
      id: 'inv-prio',
      number: 'INV-PRIO-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [
        { id: 'item-target', description: 'General Hardware', unitMinor: 1000n, qtyMilli: 1000n },
        { id: 'item-other', description: 'item-target description text', unitMinor: 2000n, qtyMilli: 1000n },
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
      { op: 'update_item', match: 'item-target', unitPrice: 50 },
    ]);

    expect(updatedInvoice.items[0]?.unitMinor).toBe(5000n); // Exact ID updated!
    expect(updatedInvoice.items[1]?.unitMinor).toBe(2000n); // Untouched
  });
});
