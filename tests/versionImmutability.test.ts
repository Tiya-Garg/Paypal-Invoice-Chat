import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Immutable Version Snapshots', () => {
  it('guarantees prior version instances remain unmodified when new version is created', () => {
    const v1: Invoice = {
      id: 'inv-snap',
      number: 'INV-SNAP-01',
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
      paypalInvoiceId: 'PP-SNAP',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice: v2 } = applyOps(v1, [
      { op: 'add_item', description: 'Item 2', unitPrice: 100 },
    ]);

    expect(v1.items.length).toBe(1);
    expect(v1.version).toBe(1);

    expect(v2.items.length).toBe(2);
    expect(v2.version).toBe(2);
  });
});

