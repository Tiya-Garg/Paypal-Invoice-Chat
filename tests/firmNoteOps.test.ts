import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Authorized Firm Operations Note Capability', () => {
  it('allows firm role to propose setting delivery note', () => {
    const inv: Invoice = {
      id: 'inv-firm-note',
      number: 'INV-FIRM-NOTE-01',
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
      paypalInvoiceId: 'PP-NOTE',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice } = applyOps(
      inv,
      [{ op: 'set_note', note: 'Please deliver to side entrance dock B' }],
      'firm',
    );

    expect(updatedInvoice.note).toBe('Please deliver to side entrance dock B');
  });
});
