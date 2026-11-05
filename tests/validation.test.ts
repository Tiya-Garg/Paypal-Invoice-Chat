import { describe, it, expect } from 'vitest';
import { invoiceInputSchema } from '../src/domain/validation.js';

describe('Invoice Input Validation Schema', () => {
  it('parses and defaults optional parameters cleanly', () => {
    const parsed = invoiceInputSchema.parse({});
    expect(parsed.currency).toBe('USD');
    expect(parsed.dueDays).toBe(15);
    expect(parsed.firmName).toBe('');
    expect(parsed.firmEmail).toBe('');
  });

  it('validates email format if provided', () => {
    const valid = invoiceInputSchema.parse({ firmEmail: 'client@example.com' });
    expect(valid.firmEmail).toBe('client@example.com');

    expect(() => invoiceInputSchema.parse({ firmEmail: 'invalid-email' })).toThrow();
  });

  it('restricts due days within reasonable bounds (1-365)', () => {
    expect(() => invoiceInputSchema.parse({ dueDays: 0 })).toThrow();
    expect(() => invoiceInputSchema.parse({ dueDays: 400 })).toThrow();
  });
});
