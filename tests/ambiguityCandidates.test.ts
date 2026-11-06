import { describe, it, expect } from 'vitest';
import { applyOps, AmbiguousMatchError } from '../src/domain/ops.js';
import type { Invoice } from '../src/domain/types.js';

describe('Ambiguous Substring Match Candidates', () => {
  it('includes all matching candidates in AmbiguousMatchError when substring is shared', () => {
    const inv: Invoice = {
      id: 'inv-ambig',
      number: 'INV-AMBIG-01',
      currency: 'USD',
      firmName: 'Client',
      firmEmail: 'c@d.com',
      items: [
        { id: '1', description: 'Hardwood Table Oak', unitMinor: 50000n, qtyMilli: 1000n },
        { id: '2', description: 'Hardwood Chair Maple', unitMinor: 15000n, qtyMilli: 1000n },
        { id: '3', description: 'Plastic Stool', unitMinor: 2000n, qtyMilli: 1000n },
      ],
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

    try {
      applyOps(inv, [{ op: 'remove_item', match: 'Hardwood' }]);
      expect.unreachable('Should have thrown AmbiguousMatchError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(AmbiguousMatchError);
      const ambigErr = err as AmbiguousMatchError;
      expect(ambigErr.candidates.length).toBe(2);
      expect(ambigErr.candidates.map(c => c.description)).toContain('Hardwood Table Oak');
      expect(ambigErr.candidates.map(c => c.description)).toContain('Hardwood Chair Maple');
    }
  });
});

