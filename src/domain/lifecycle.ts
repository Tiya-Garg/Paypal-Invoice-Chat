import type { InvoiceStatus } from './types.js';

/**
 * Validates invoice lifecycle status transitions:
 * - DRAFT -> SENT
 * - SENT -> APPROVED | PAID | CANCELLED
 * - APPROVED -> PAID | CANCELLED | SENT (if revised)
 * - Final locked states: PAID, CANCELLED, REFUNDED (no transitions allowed)
 */
export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return true;

  // Locked states cannot transition to anything
  if (['PAID', 'CANCELLED', 'REFUNDED', 'MARKED_AS_PAID', 'MARKED_AS_REFUNDED'].includes(from)) {
    return false;
  }

  switch (from) {
    case 'NONE':
      return to === 'DRAFT';
    case 'DRAFT':
      return to === 'SENT' || to === 'CANCELLED';
    case 'SENT':
      return ['APPROVED', 'PAID', 'CANCELLED', 'PARTIALLY_PAID', 'PAYMENT_PENDING'].includes(to);
    case 'APPROVED':
      return ['SENT', 'PAID', 'CANCELLED'].includes(to);
    default:
      return false;
  }
}

