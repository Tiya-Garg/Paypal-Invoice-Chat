import { describe, it, expect } from 'vitest';
import { canTransition } from '../src/domain/lifecycle.js';

describe('Invoice Lifecycle Transitions', () => {
  it('allows valid state progressions', () => {
    expect(canTransition('NONE', 'DRAFT')).toBe(true);
    expect(canTransition('DRAFT', 'SENT')).toBe(true);
    expect(canTransition('SENT', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'PAID')).toBe(true);
    expect(canTransition('APPROVED', 'SENT')).toBe(true); // Re-revision
  });

  it('prohibits mutations from locked states', () => {
    expect(canTransition('PAID', 'SENT')).toBe(false);
    expect(canTransition('CANCELLED', 'DRAFT')).toBe(false);
    expect(canTransition('REFUNDED', 'APPROVED')).toBe(false);
  });
});

