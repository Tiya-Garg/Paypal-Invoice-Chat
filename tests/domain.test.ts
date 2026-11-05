import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyOps, AmbiguousMatchError, ItemNotFoundError, type DomainOp } from '../src/domain/ops.js';
import { calculateInvoiceTotals } from '../src/domain/calculator.js';
import { toMinorUnits, toPayPalDecimal, toPayPalQuantity, toQtyMilli } from '../src/domain/money.js';
import type { Invoice } from '../src/domain/types.js';

function createBlankInvoice(): Invoice {
  return {
    id: 'inv-1',
    number: 'INV-0001',
    currency: 'USD',
    firmName: '',
    firmEmail: '',
    items: [],
    tax: null,
    discount: null,
    dueDays: 15,
    note: null,
    status: 'NONE',
    version: 0,
    paypalInvoiceId: null,
    paypalStatus: null,
    recipientViewUrl: null,
    syncState: 'synced',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Domain Money Arithmetic', () => {
  it('converts major units to minor integer units without float errors', () => {
    expect(toMinorUnits(5000)).toBe(500000n);
    expect(toMinorUnits('5000.50')).toBe(500050n);
    expect(toMinorUnits('0.99')).toBe(99n);
    expect(() => toMinorUnits(-10)).toThrow();
  });

  it('formats minor integer units to PayPal decimal format', () => {
    expect(toPayPalDecimal(500000n)).toBe('5000.00');
    expect(toPayPalDecimal(5025n)).toBe('50.25');
    expect(toPayPalDecimal(9n)).toBe('0.09');
  });

  it('parses and formats 3-decimal quantity milli-units', () => {
    expect(toQtyMilli(1)).toBe(1000n);
    expect(toQtyMilli('2.5')).toBe(2500n);
    expect(toQtyMilli('0.125')).toBe(125n);
    expect(toPayPalQuantity(1000n)).toBe('1');
    expect(toPayPalQuantity(2500n)).toBe('2.5');
    expect(toPayPalQuantity(125n)).toBe('0.125');
  });
});

describe('Domain Ops Engine', () => {
  it('creates draft v1 on first items added', () => {
    const inv = createBlankInvoice();
    const ops: DomainOp[] = [
      { op: 'set_firm', name: 'Firm X', email: 'ap@firmx.com' },
      { op: 'add_item', description: 'Material A', unitPrice: 5000 },
      { op: 'add_item', description: 'Material B', unitPrice: 8000 },
    ];
    const { updatedInvoice, summaries } = applyOps(inv, ops, 'seller');
    expect(updatedInvoice.status).toBe('DRAFT');
    expect(updatedInvoice.version).toBe(1);
    expect(updatedInvoice.items.length).toBe(2);
    expect(updatedInvoice.firmName).toBe('Firm X');
    expect(updatedInvoice.firmEmail).toBe('ap@firmx.com');
    expect(summaries.length).toBe(3);

    const totals = calculateInvoiceTotals(updatedInvoice);
    expect(totals.totalMinor).toBe(1300000n); // 13,000.00
  });

  it('resolves item update by exact description and unique substring', () => {
    const inv = createBlankInvoice();
    const { updatedInvoice: inv1 } = applyOps(inv, [
      { op: 'add_item', description: 'Material A', unitPrice: 5000 },
      { op: 'add_item', description: 'Material B', unitPrice: 8000 },
    ]);

    // Update by substring
    const { updatedInvoice: inv2 } = applyOps(inv1, [
      { op: 'update_item', match: 'Material A', unitPrice: 5500 },
    ]);
    expect(inv2.items[0]?.unitMinor).toBe(550000n);

    const totals = calculateInvoiceTotals(inv2);
    expect(totals.totalMinor).toBe(1350000n);
  });

  it('throws AmbiguousMatchError when match matches multiple items', () => {
    const inv = createBlankInvoice();
    const { updatedInvoice } = applyOps(inv, [
      { op: 'add_item', description: 'Material A', unitPrice: 5000 },
      { op: 'add_item', description: 'Material B', unitPrice: 8000 },
    ]);

    expect(() => {
      applyOps(updatedInvoice, [{ op: 'remove_item', match: 'Material' }]);
    }).toThrowError(AmbiguousMatchError);
  });

  it('atomically rolls back changes if any op in a batch fails', () => {
    const inv = createBlankInvoice();
    const { updatedInvoice: initial } = applyOps(inv, [
      { op: 'add_item', description: 'Widget', unitPrice: 100 },
    ]);

    expect(() => {
      applyOps(initial, [
        { op: 'add_item', description: 'Gadget', unitPrice: 200 },
        { op: 'update_item', match: 'Non-Existent', unitPrice: 999 }, // Fails
      ]);
    }).toThrowError(ItemNotFoundError);

    // Initial invoice must remain untouched
    expect(initial.items.length).toBe(1);
    expect(initial.items[0]?.description).toBe('Widget');
  });

  it('bumps version and resets approval when updated after SENT', () => {
    const inv = createBlankInvoice();
    const { updatedInvoice: draft } = applyOps(inv, [
      { op: 'add_item', description: 'Service', unitPrice: 1000 },
    ]);
    draft.status = 'SENT';
    draft.version = 1;

    // Firm approves
    draft.status = 'APPROVED';

    // Seller makes another edit
    const { updatedInvoice: v2 } = applyOps(draft, [
      { op: 'add_item', description: 'Installation', unitPrice: 300 },
    ]);

    expect(v2.version).toBe(2);
    expect(v2.status).toBe('SENT'); // Approval reset!
  });

  it('enforces firm role limitations', () => {
    const inv = createBlankInvoice();
    inv.status = 'SENT';
    inv.version = 1;

    expect(() => {
      applyOps(inv, [{ op: 'set_tax', name: 'GST', percent: 0 }], 'firm');
    }).toThrow('Firm is not allowed to adjust tax');

    expect(() => {
      applyOps(inv, [{ op: 'set_firm', name: 'Other', email: 'other@test.com' }], 'firm');
    }).toThrow('Firm is not allowed to change invoice billing details');
  });

  it('calculates tax and discounts following PayPal calculation order', () => {
    const inv = createBlankInvoice();
    const { updatedInvoice } = applyOps(inv, [
      { op: 'add_item', description: 'SubtotalItem', unitPrice: 1000 }, // 1000.00
      { op: 'set_discount', kind: 'percent', value: 10 }, // 10% discount -> 100.00
      { op: 'set_tax', name: 'GST', percent: 18 }, // 18% tax on 900.00 -> 162.00
    ]);

    const totals = calculateInvoiceTotals(updatedInvoice);
    expect(totals.subtotalMinor).toBe(100000n);
    expect(totals.discountMinor).toBe(10000n);
    expect(totals.taxMinor).toBe(16200n);
    expect(totals.totalMinor).toBe(106200n); // 1000 - 100 + 162 = 1062.00
  });
});

describe('Fast-Check Invariant Property Tests', () => {
  it('always guarantees total = subtotal - discount + tax and total >= 0', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            unitPrice: fc.integer({ min: 1, max: 1_000_000 }),
            qty: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.option(fc.integer({ min: 1, max: 50 }), { nil: null }), // discount %
        fc.option(fc.integer({ min: 1, max: 30 }), { nil: null }), // tax %
        (items, discountPct, taxPct) => {
          const inv = createBlankInvoice();
          const ops: DomainOp[] = items.map((it, idx) => ({
            op: 'add_item',
            description: `Item ${idx}`,
            unitPrice: it.unitPrice,
            qty: it.qty,
          }));

          if (discountPct !== null) {
            ops.push({ op: 'set_discount', kind: 'percent', value: discountPct });
          }
          if (taxPct !== null) {
            ops.push({ op: 'set_tax', name: 'Tax', percent: taxPct });
          }

          const { updatedInvoice } = applyOps(inv, ops);
          const totals = calculateInvoiceTotals(updatedInvoice);

          expect(totals.totalMinor).toBe(
            totals.subtotalMinor - totals.discountMinor + totals.taxMinor,
          );
          expect(totals.totalMinor).toBeGreaterThanOrEqual(0n);
          expect(totals.discountMinor).toBeLessThanOrEqual(totals.subtotalMinor);
        },
      ),
      { numRuns: 100 },
    );
  });
});

