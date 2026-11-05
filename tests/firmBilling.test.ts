import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Recipient Billing Details', () => {
  it('updates firm business name and contact email', () => {
    const inv: Invoice = {
      id: 'inv-firm',
      number: 'INV-FIRM-01',
      currency: 'USD',
      firmName: 'Old Firm',
      firmEmail: 'old@firm.com',
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

    const { updatedInvoice } = applyOps(inv, [
      { op: 'set_firm', name: 'New Firm Global', email: 'billing@newfirm.com' },
    ]);

    expect(updatedInvoice.firmName).toBe('New Firm Global');
    expect(updatedInvoice.firmEmail).toBe('billing@newfirm.com');
  });
});
