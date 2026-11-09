/**
 * Client-side Real-time Tax & Discount Calculator:
 * Provides instant preview updates as the user edits quantities or prices before persisting.
 */
export function calculatePreviewTotals(items, taxPercentBps, discount) {
  let subtotal = 0;
  for (const item of (items || [])) {
    subtotal += Math.max(0, Number(item.qty || 0)) * Math.max(0, Number(item.unitPrice || 0));
  }

  let discountAmount = 0;
  if (discount) {
    if (discount.kind === 'percent') {
      discountAmount = (subtotal * Number(discount.bps || 0)) / 10000;
    } else {
      discountAmount = Number(discount.amount || 0);
    }
    // Cannot discount more than subtotal
    discountAmount = Math.min(discountAmount, subtotal);
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * Number(taxPercentBps || 0)) / 10000;
  const total = taxableAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    total,
  };
}
