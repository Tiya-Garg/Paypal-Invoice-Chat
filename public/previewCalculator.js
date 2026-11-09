/**
 * Client-side Real-time Tax & Discount Calculator:
 * Provides instant preview updates as the user edits quantities or prices before persisting.
 */
export interface PreviewLineItem {
  qty: number;
  unitPrice: number;
}

export interface PreviewSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
}

export function calculatePreviewTotals(
  items: PreviewLineItem[],
  taxPercentBps: number,
  discount: { kind: 'percent'; bps: number } | { kind: 'amount'; amount: number } | null,
): PreviewSummary {
  let subtotal = 0;
  for (const item of items) {
    subtotal += Math.max(0, item.qty) * Math.max(0, item.unitPrice);
  }

  let discountAmount = 0;
  if (discount) {
    if (discount.kind === 'percent') {
      discountAmount = (subtotal * discount.bps) / 10000;
    } else {
      discountAmount = discount.amount;
    }
    // Cannot discount more than subtotal
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * taxPercentBps) / 10000;
  const total = taxableAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}
