import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item In-Place Quantity Update', () => {
  it('updates item quantity while preserving description and unit price', () => {
    const inv: Invoice = {
      id: 'inv-upd-qty',
      number: 'INV-QTY-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Labor Hours', unitMinor: 7500n, qtyMilli: 10000n }], // 10.000 hours
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
      { op: 'update_item', match: 'Labor Hours', qty: 15.5 }, // 15.500 hours
    ]);

    expect(updatedInvoice.items[0]?.description).toBe('Labor Hours');
    expect(updatedInvoice.items[0]?.unitMinor).toBe(7500n);
    expect(updatedInvoice.items[0]?.qtyMilli).toBe(15500n);
  });
});

