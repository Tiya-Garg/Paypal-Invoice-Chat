/**
 * Helper to check whether an invoice status represents a terminal state
 */
export function isTerminalStatus(status: string): boolean {
  return ['PAID', 'CANCELLED', 'REFUNDED', 'MARKED_AS_PAID', 'MARKED_AS_REFUNDED'].includes(
    status.toUpperCase(),
  );
}
