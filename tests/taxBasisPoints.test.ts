import { describe, it, expect } from 'vitest';
import { applyOps } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Percentage Tax Rate Precision', () => {
  it('converts floating tax percentages to integer basis points', () => {
    const inv: Invoice = {
      id: 'inv-tax-bps',
      number: 'INV-TAX-BPS-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [{ id: '1', description: 'Item A', unitMinor: 10000n, qtyMilli: 1000n }],
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

    const { updatedInvoice } = applyOps(inv, [{ op: 'set_tax', name: 'State Tax', percent: 8.25 }]);
    expect(updatedInvoice.tax?.name).toBe('State Tax');
    expect(updatedInvoice.tax?.percentBps).toBe(825n); // 825 basis points = 8.25%
  });
});

