import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Payment Due Days Boundaries', () => {
  it('enforces positive integer due days with round and floor at 1 day', () => {
    const inv: Invoice = {
      id: 'inv-due',
      number: 'INV-DUE-01',
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

    const { updatedInvoice: inv30 } = applyOps(inv, [{ op: 'set_due_days', days: 30 }]);
    expect(inv30.dueDays).toBe(30);

    const { updatedInvoice: invMin } = applyOps(inv, [{ op: 'set_due_days', days: -10 }]);
    expect(invMin.dueDays).toBe(1); // Min floored at 1
  });
});

