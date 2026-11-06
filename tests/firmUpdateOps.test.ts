import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Authorized Firm Operations Update Capability', () => {
  it('allows firm role to propose updating item quantity', () => {
    const inv: Invoice = {
      id: 'inv-firm-upd',
      number: 'INV-FIRM-UPD-01',
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
      paypalInvoiceId: 'PP-UPD',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice } = applyOps(
      inv,
      [{ op: 'update_item', match: 'Item 1', qty: 3 }],
      'firm',
    );

    expect(updatedInvoice.items[0]?.qtyMilli).toBe(3000n);
  });
});

