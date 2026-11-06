import { describe, it, expect } from 'vitest';
import { mapPayPalStatus } from '../src/worker/outbox.js';

describe('PayPal Status Exhaustive Mapping Invariants', () => {
  it('covers all official PayPal v2 status values', () => {
    const testCases = [
      ['DRAFT', 'DRAFT'],
      ['SENT', 'SENT'],
      ['SCHEDULED', 'SCHEDULED'],
      ['PAID', 'PAID'],
      ['MARKED_AS_PAID', 'MARKED_AS_PAID'],
      ['CANCELLED', 'CANCELLED'],
      ['REFUNDED', 'REFUNDED'],
      ['PARTIALLY_PAID', 'PARTIALLY_PAID'],
      ['PARTIALLY_REFUNDED', 'PARTIALLY_REFUNDED'],
      ['MARKED_AS_REFUNDED', 'MARKED_AS_REFUNDED'],
      ['UNPAID', 'UNPAID'],
      ['PAYMENT_PENDING', 'PAYMENT_PENDING'],
    ] as const;

    for (const [input, expected] of testCases) {
      expect(mapPayPalStatus(input)).toBe(expected);
    }
  });
});

