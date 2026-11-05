import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Customer Note Updates', () => {
  it('updates or removes customer note on invoice', () => {
    const inv: Invoice = {
      id: 'inv-note',
      number: 'INV-NOTE-01',
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

    const { updatedInvoice: withNote } = applyOps(inv, [{ op: 'set_note', note: 'Wire transfer details inside' }]);
    expect(withNote.note).toBe('Wire transfer details inside');

    const { updatedInvoice: withoutNote } = applyOps(withNote, [{ op: 'set_note', note: null }]);
    expect(withoutNote.note).toBeNull();
  });
});
