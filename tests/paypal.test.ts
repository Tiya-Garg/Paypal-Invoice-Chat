import { describe, it, expect, vi } from 'vitest';
import { buildPayPalInvoicePayload, PayPalClient } from '../src/paypal/client.js';
import { OutboxWorker, mapPayPalStatus } from '../src/worker/outbox.js';
import type { Invoice } from '../src/domain/types.js';

describe('PayPal Integration & Outbox Suite', () => {
  const sampleInvoice: Invoice = {
    id: 'inv-test-1',
    number: 'INV-1001',
    currency: 'USD',
    firmName: 'Acme Corp',
    firmEmail: 'billing@acme.test',
    items: [
      { id: '1', description: 'Item 1', unitMinor: 500000n, qtyMilli: 1000n }, // $5000
      { id: '2', description: 'Item 2', unitMinor: 800000n, qtyMilli: 1000n }, // $8000
    ],
    tax: { name: 'VAT', percentBps: 2000n }, // 20%
    discount: { kind: 'percent', percentBps: 1000n }, // 10%
    dueDays: 14,
    note: 'Thank you for your business',
    status: 'DRAFT',
    version: 1,
    paypalInvoiceId: null,
    paypalStatus: null,
    recipientViewUrl: null,
    syncState: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('builds valid Invoicing v2 payload from internal invoice model', () => {
    const payload = buildPayPalInvoicePayload(sampleInvoice);

    expect(payload.detail.invoice_number).toBe('INV-1001');
    expect(payload.detail.currency_code).toBe('USD');
    expect(payload.primary_recipients[0]?.billing_info.business_name).toBe('Acme Corp');
    expect(payload.primary_recipients[0]?.billing_info.email_address).toBe('billing@acme.test');
    expect(payload.items.length).toBe(2);
    expect(payload.items[0]?.unit_amount.value).toBe('5000.00');
    expect(payload.items[0]?.tax?.percent).toBe('20');
    expect(payload.amount?.breakdown?.discount?.invoice_discount?.percent).toBe('10');
  });

  it('maps all PayPal status strings correctly to domain status', () => {
    expect(mapPayPalStatus('DRAFT')).toBe('DRAFT');
    expect(mapPayPalStatus('SENT')).toBe('SENT');
    expect(mapPayPalStatus('PAID')).toBe('PAID');
    expect(mapPayPalStatus('CANCELLED')).toBe('CANCELLED');
    expect(mapPayPalStatus('REFUNDED')).toBe('REFUNDED');
    expect(mapPayPalStatus('PAYMENT_PENDING')).toBe('PAYMENT_PENDING');
  });

  it('asserts equal totals and catches discrepancy between local and PayPal calculations', async () => {
    const mockClient = new PayPalClient();

    // Mock getInvoice returning matching total ($14,040.00)
    // 13000 subtotal - 1300 (10%) = 11700 + 2340 (20% VAT) = 14040.00
    vi.spyOn(mockClient, 'getInvoice').mockResolvedValue({
      id: 'PP-123',
      detail: {
        invoice_number: 'INV-1001',
        currency_code: 'USD',
        metadata: { recipient_view_url: 'https://paypal.com/pay/PP-123' },
      },
      primary_recipients: [{ billing_info: { email_address: 'a@b.com' } }],
      items: [],
      amount: { value: '14040.00' },
      status: 'SENT',
    });

    const worker = new OutboxWorker(mockClient);
    await expect(worker.verifyInvoiceTotal('PP-123', sampleInvoice)).resolves.not.toThrow();
    expect(sampleInvoice.recipientViewUrl).toBe('https://paypal.com/pay/PP-123');

    // Simulate divergence (e.g. PayPal returned 14000.00 due to hypothetical discount order bug)
    vi.spyOn(mockClient, 'getInvoice').mockResolvedValueOnce({
      id: 'PP-123',
      detail: { invoice_number: 'INV-1001', currency_code: 'USD' },
      primary_recipients: [{ billing_info: { email_address: 'a@b.com' } }],
      items: [],
      amount: { value: '14000.00' }, // Discrepancy!
      status: 'SENT',
    });

    await expect(worker.verifyInvoiceTotal('PP-123', sampleInvoice)).rejects.toThrow('Total mismatch detected');
  });
});
