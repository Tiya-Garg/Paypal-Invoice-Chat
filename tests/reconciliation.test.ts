import { describe, it, expect } from 'vitest';
import { ReconciliationWorker } from '../src/worker/reconciliation.js';
import type { Invoice } from '../src/domain/types.js';

describe('Reconciliation Worker', () => {
  it('detects remote payment on PayPal and flips local status from SENT to PAID', async () => {
    const worker = new ReconciliationWorker();
    const inv: Invoice = {
      id: 'inv-recon-1',
      number: 'INV-101',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'SENT',
      version: 1,
      paypalInvoiceId: 'PP-RECON-1',
      paypalStatus: 'SENT',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await worker.reconcileInvoice(inv, async () => 'PAID');
    expect(res.updated).toBe(true);
    expect(res.newStatus).toBe('PAID');
    expect(inv.status).toBe('PAID');
  });

  it('skips invoices that are already in a terminal state', async () => {
    const worker = new ReconciliationWorker();
    const inv: Invoice = {
      id: 'inv-recon-2',
      number: 'INV-102',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [],
      tax: null,
      discount: null,
      dueDays: 15,
      note: null,
      status: 'PAID',
      version: 1,
      paypalInvoiceId: 'PP-RECON-2',
      paypalStatus: 'PAID',
      recipientViewUrl: null,
      syncState: 'synced',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let called = false;
    const res = await worker.reconcileInvoice(inv, async () => {
      called = true;
      return 'PAID';
    });

    expect(res.updated).toBe(false);
    expect(called).toBe(false);
  });
});
