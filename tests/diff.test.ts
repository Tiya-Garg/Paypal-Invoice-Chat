import { describe, it, expect } from 'vitest';
import { computeInvoiceDiff } from '../src/domain/diff.js';
import type { Invoice } from '../src/domain/types.js';

describe('Invoice Version Diffing', () => {
  const baseInvoice: Invoice = {
    id: 'inv-1',
    number: 'INV-0001',
    currency: 'USD',
    firmName: 'Firm X',
    firmEmail: 'ap@firmx.com',
    items: [
      { id: '1', description: 'Item 1', unitMinor: 1000n, qtyMilli: 1000n },
      { id: '2', description: 'Item 2', unitMinor: 2000n, qtyMilli: 1000n },
    ],
    tax: null,
    discount: null,
    dueDays: 14,
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

  it('detects added, removed, and modified items between versions', () => {
    const v2: Invoice = {
      ...baseInvoice,
      version: 2,
      items: [
        { id: '1', description: 'Item 1 (Updated)', unitMinor: 1500n, qtyMilli: 1000n }, // Modified
        { id: '3', description: 'Item 3 (New)', unitMinor: 3000n, qtyMilli: 1000n }, // Added
      ],
      tax: { name: 'VAT', percentBps: 2000n }, // Tax added
    };

    const diff = computeInvoiceDiff(baseInvoice, v2);

    expect(diff.versionFrom).toBe(1);
    expect(diff.versionTo).toBe(2);
    expect(diff.addedItems).toContain('Item 3 (New)');
    expect(diff.removedItems).toContain('Item 2');
    expect(diff.modifiedItems.length).toBe(1);
    expect(diff.modifiedItems[0]?.id).toBe('1');
    expect(diff.taxChanged).toBe(true);
    expect(diff.discountChanged).toBe(false);
  });
});

