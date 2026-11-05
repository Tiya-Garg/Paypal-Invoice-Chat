import type { Invoice, InvoiceTotals } from './types.js';
import { divRoundHalfUp } from './money.js';

/**
 * Calculates item subtotal in minor units:
 * item_amount = (unit_minor * qty_milli) / 1000 with half-up rounding.
 */
export function calculateItemTotal(unitMinor: bigint, qtyMilli: bigint): bigint {
  return divRoundHalfUp(unitMinor * qtyMilli, 1000n);
}

/**
 * Computes complete invoice breakdown following PayPal Invoicing v2 calculation order:
 * DOC: https://developer.paypal.com/api/invoicing/v2/#definition-amount_summary_detail
 *
 * 1. Line item amounts = sum(unitMinor * qtyMilli)
 * 2. Subtotal = sum of all line item amounts
 * 3. Discount applied to invoice (either percent BPS of subtotal, or fixed minor amount)
 * 4. Tax applied to invoice items / subtotal after line adjustments
 * 5. Total = max(0, Subtotal - Discount + Tax)
 */
export function calculateInvoiceTotals(invoice: Invoice): InvoiceTotals {
  let subtotalMinor = 0n;
  for (const item of invoice.items) {
    subtotalMinor += calculateItemTotal(item.unitMinor, item.qtyMilli);
  }

  let discountMinor = 0n;
  if (invoice.discount) {
    if (invoice.discount.kind === 'percent') {
      // percentBps: 10000n = 100.00%
      discountMinor = divRoundHalfUp(subtotalMinor * invoice.discount.percentBps, 10000n);
    } else {
      discountMinor = invoice.discount.amountMinor;
    }
  }

  // Discount cannot exceed subtotal
  if (discountMinor > subtotalMinor) {
    discountMinor = subtotalMinor;
  }

  const taxableBase = subtotalMinor - discountMinor;
  let taxMinor = 0n;
  if (invoice.tax && taxableBase > 0n) {
    taxMinor = divRoundHalfUp(taxableBase * invoice.tax.percentBps, 10000n);
  }

  const totalMinor = subtotalMinor - discountMinor + taxMinor;

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: totalMinor < 0n ? 0n : totalMinor,
  };
}

