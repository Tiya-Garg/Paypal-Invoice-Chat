import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Atomic Rollback Multi-Op Batches', () => {
  it('guarantees complete rollback when third op in a 5-op batch throws', () => {
    const inv: Invoice = {
      id: 'inv-atomic',
      number: 'INV-ATOMIC-01',
      currency: 'USD',
      firmName: 'Initial Firm',
      firmEmail: 'initial@firm.com',
      items: [{ id: 'item-1', description: 'Existing Item', unitMinor: 1000n, qtyMilli: 1000n }],
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

    expect(() => {
      applyOps(inv, [
        { op: 'add_item', description: 'Item 2', unitPrice: 50 },
        { op: 'set_tax', name: 'VAT', percent: 20 },
        { op: 'update_item', match: 'Non-Existent-Item-XYZ', unitPrice: 999 }, // Throws!
        { op: 'set_note', note: 'Batch Note' },
      ]);
    }).toThrow();

    // Verify invoice state is completely pristine
    expect(inv.items.length).toBe(1);
    expect(inv.tax).toBeNull();
    expect(inv.note).toBeNull();
    expect(inv.items[0]?.description).toBe('Existing Item');
  });
});
