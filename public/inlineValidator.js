/**
 * Live Item Edit Inline Validator:
 * Checks quantity and unit price inputs for real-time validity and displays error cues.
 */
export function validateInlineEdit(qtyStr: string, priceStr: string): { valid: boolean; error?: string } {
  const qty = parseFloat(qtyStr);
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'Quantity must be greater than 0' };
  }
  const price = parseFloat(priceStr);
  if (isNaN(price) || price < 0) {
    return { valid: false, error: 'Price cannot be negative' };
  }
  return { valid: true };
}
