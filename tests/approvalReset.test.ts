import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Approval Reset on Post-Sent Mutation', () => {
  it('resets APPROVED status back to SENT upon seller edit', () => {
    const inv: Invoice = {
      id: 'inv-appr-rst',
      number: 'INV-APPR-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item 1', unitMinor: 5000n, qtyMilli: 1000n }],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'APPROVED',
      version: 1,
      paypalInvoiceId: 'PP-APPR',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { updatedInvoice } = applyOps(inv, [
      { op: 'add_item', description: 'Extra Service', unitPrice: 50 },
    ]);

    expect(updatedInvoice.status).toBe('SENT'); // Approval reset
    expect(updatedInvoice.version).toBe(2);
  });
});
