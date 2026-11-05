/**
 * Generates next human-readable invoice number: INV-0001, INV-0002...
 */
export function formatInvoiceNumber(seqNumber: number, prefix = 'INV'): string {
  if (seqNumber <= 0 || !Number.isInteger(seqNumber)) {
    throw new Error('Invoice sequence number must be a positive integer');
  }
  return `${prefix}-${String(seqNumber).padStart(4, '0')}`;
}
