import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Multiple Items Batch Creation', () => {
  it('creates multiple invoice items in sequential order within a single batch', () => {
    const inv: Invoice = {
      id: 'inv-multi-add',
      number: 'INV-MULTI-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'NONE',
      version: 0,
      paypalInvoiceId: null,
      paypalStatus: null,
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice, summaries } = applyOps(inv, [
      { op: 'add_item', description: 'Product 1', unitPrice: 10 },
      { op: 'add_item', description: 'Product 2', unitPrice: 20 },
      { op: 'add_item', description: 'Product 3', unitPrice: 30 },
    ]);

    expect(updatedInvoice.items.length).toBe(3);
    expect(updatedInvoice.items[0]?.description).toBe('Product 1');
    expect(updatedInvoice.items[1]?.description).toBe('Product 2');
    expect(updatedInvoice.items[2]?.description).toBe('Product 3');
    expect(updatedInvoice.status).toBe('DRAFT');
    expect(updatedInvoice.version).toBe(1);
    expect(summaries.length).toBe(3);
  });
});

