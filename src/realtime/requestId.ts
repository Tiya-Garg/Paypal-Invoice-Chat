/**
 * Generates client-side UUID idempotency key for socket retries
 */
export function generateClientRequestId(): string {
  return 'req-' + Math.random().toString(36).slice(2, 11) + '-' + Date.now();
}

