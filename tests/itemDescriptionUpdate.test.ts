import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Item In-Place Description Update', () => {
  it('updates item description while preserving quantity and unit price', () => {
    const inv: Invoice = {
      id: 'inv-upd-desc',
      number: 'INV-DESC-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Raw Steel', unitMinor: 50000n, qtyMilli: 2500n }],
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
      { op: 'update_item', match: 'Raw Steel', description: 'Structural Grade Steel (ASTM A36)' },
    ]);

    expect(updatedInvoice.items[0]?.description).toBe('Structural Grade Steel (ASTM A36)');
    expect(updatedInvoice.items[0]?.unitMinor).toBe(50000n);
    expect(updatedInvoice.items[0]?.qtyMilli).toBe(2500n);
  });
});

