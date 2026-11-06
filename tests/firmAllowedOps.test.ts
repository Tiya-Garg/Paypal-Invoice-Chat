import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Authorized Firm Operations Capability', () => {
  it('allows firm role to add item proposal successfully', () => {
    const inv: Invoice = {
      id: 'inv-firm-add',
      number: 'INV-FIRM-ADD-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item 1', unitMinor: 5000n, qtyMilli: 1000n }],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'SENT',
      version: 1,
      paypalInvoiceId: 'PP-ADD',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice, summaries } = applyOps(
      inv,
      [{ op: 'add_item', description: 'On-site training service', unitPrice: 2000 }],
      'firm',
    );

    expect(updatedInvoice.items.length).toBe(2);
    expect(updatedInvoice.items[1]?.description).toBe('On-site training service');
    expect(summaries[0]).toContain('Added item');
  });
});

