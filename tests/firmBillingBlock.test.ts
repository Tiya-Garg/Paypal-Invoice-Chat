import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Role Boundary Protection Against Firm Billing Changes', () => {
  it('blocks firm role from altering seller or firm billing info', () => {
    const inv: Invoice = {
      id: 'inv-firm-bill',
      number: 'INV-FIRM-BILL-01',
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
      paypalInvoiceId: 'PP-BILL',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => {
      applyOps(inv, [{ op: 'set_firm', name: 'Hacked Firm' }], 'firm');
    }).toThrow('Firm is not allowed to change invoice billing details');
  });
});
