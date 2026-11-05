import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item In-Place Price Update', () => {
  it('updates unit price while preserving quantity and description', () => {
    const inv: Invoice = {
      id: 'inv-upd-price',
      number: 'INV-PRICE-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Consulting', unitMinor: 10000n, qtyMilli: 2000n }], // $100
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

    const { updatedInvoice } = applyOps(inv, [
      { op: 'update_item', match: 'Consulting', unitPrice: 125 }, // $125
    ]);

    expect(updatedInvoice.items[0]?.description).toBe('Consulting');
    expect(updatedInvoice.items[0]?.unitMinor).toBe(12500n);
    expect(updatedInvoice.items[0]?.qtyMilli).toBe(2000n);
  });
});
