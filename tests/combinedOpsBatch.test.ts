import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Multiple Edit Operations within Batch', () => {
  it('processes combined add, update, and tax edits atomically', () => {
    const inv: Invoice = {
      id: 'inv-combo',
      number: 'INV-COMBO-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item A', unitMinor: 1000n, qtyMilli: 1000n }],
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

    const { updatedInvoice, summaries } = applyOps(inv, [
      { op: 'add_item', description: 'Item B', unitPrice: 20 },
      { op: 'update_item', match: 'Item A', unitPrice: 15 },
      { op: 'set_tax', name: 'VAT', percent: 10 },
    ]);

    expect(updatedInvoice.items.length).toBe(2);
    expect(updatedInvoice.items[0]?.unitMinor).toBe(1500n);
    expect(updatedInvoice.items[1]?.unitMinor).toBe(2000n);
    expect(updatedInvoice.tax?.percentBps).toBe(1000n);
    expect(summaries.length).toBe(3);
  });
});
