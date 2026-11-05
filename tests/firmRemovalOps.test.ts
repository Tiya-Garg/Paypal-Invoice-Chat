import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Authorized Firm Operations Item Removal', () => {
  it('allows firm role to propose removing an unnecessary item', () => {
    const inv: Invoice = {
      id: 'inv-firm-rm',
      number: 'INV-FIRM-RM-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [
        { id: '1', description: 'Item 1', unitMinor: 5000n, qtyMilli: 1000n },
        { id: '2', description: 'Unneeded Expedited Fee', unitMinor: 1500n, qtyMilli: 1000n },
      ],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'SENT',
      version: 1,
      paypalInvoiceId: 'PP-RM',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice } = applyOps(
      inv,
      [{ op: 'remove_item', match: 'Unneeded Expedited Fee' }],
      'firm',
    );

    expect(updatedInvoice.items.length).toBe(1);
    expect(updatedInvoice.items[0]?.description).toBe('Item 1');
  });
});
