import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Role Boundary Protection Against Firm Due Date Mutating', () => {
  it('blocks firm role from altering payment due days', () => {
    const inv: Invoice = {
      id: 'inv-firm-due',
      number: 'INV-FIRM-DUE-01',
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
      paypalInvoiceId: 'PP-DUE',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => {
      applyOps(inv, [{ op: 'set_due_days', days: 60 }], 'firm');
    }).toThrow('Firm cannot change payment due date');
  });
});

