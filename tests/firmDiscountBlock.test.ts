import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Role Boundary Protection Against Firm Discount Mutating', () => {
  it('blocks firm role from setting fixed or percentage discounts', () => {
    const inv: Invoice = {
      id: 'inv-firm-disc',
      number: 'INV-FIRM-DISC-01',
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
      paypalInvoiceId: 'PP-DISC',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => {
      applyOps(inv, [{ op: 'set_discount', kind: 'percent', value: 20 }], 'firm');
    }).toThrow('Firm is not allowed to adjust discount');
  });
});

