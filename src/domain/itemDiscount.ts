/**
 * Calculates effective line item discount amount in minor currency units (cents/paise).
 * Enforces discount caps so that discount amount never exceeds item total.
 * Supports both percentage basis points (e.g. 1000 bps = 10.00%) and fixed minor amounts.
 */
export function calculateItemDiscountMinor(
  unitMinor: bigint,
  qtyMilli: bigint,
  discount: { type: 'percent' | 'fixed'; value: number } | null | undefined,
): bigint {
  if (!discount || discount.value <= 0) {
    return 0n;
  }

  const grossMinor = (unitMinor * qtyMilli) / 1000n;
  if (grossMinor <= 0n) {
    return 0n;
  }

  let discountMinor = 0n;
  if (discount.type === 'percent') {
    // basis points: 10000 bps = 100%
    const bps = BigInt(Math.min(Math.max(0, Math.round(discount.value)), 10000));
    discountMinor = (grossMinor * bps) / 10000n;
  } else {
    // Fixed minor units
    discountMinor = BigInt(Math.max(0, Math.round(discount.value)));
  }

  // Cap at grossMinor so discount can never exceed gross line item amount
  return discountMinor > grossMinor ? grossMinor : discountMinor;
}

