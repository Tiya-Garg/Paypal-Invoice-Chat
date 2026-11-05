import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item Deletion', () => {
  it('removes target item and updates version upon deletion', () => {
    const inv: Invoice = {
      id: 'inv-rm',
      number: 'INV-RM-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [
        { id: '1', description: 'Item A', unitMinor: 1000n, qtyMilli: 1000n },
        { id: '2', description: 'Item B', unitMinor: 2000n, qtyMilli: 1000n },
      ],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'SENT',
      version: 1,
      paypalInvoiceId: null,
      paypalStatus: null,
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice, summaries } = applyOps(inv, [{ op: 'remove_item', match: 'Item A' }]);
    expect(updatedInvoice.items.length).toBe(1);
    expect(updatedInvoice.items[0]?.description).toBe('Item B');
    expect(updatedInvoice.version).toBe(2);
    expect(summaries[0]).toContain('Removed item "Item A"');
  });
});
