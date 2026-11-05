import { describe, it, expect } from 'vitest';
import { regexFallbackParser } from '../src/llm/fallback.js';

describe('Deterministic Regex Fallback Parser', () => {
  it('parses "add 3k for installation service"', () => {
    const ops = regexFallbackParser('@PayPal add 3k for installation service');
    expect(ops.length).toBe(1);
    expect(ops[0]).toEqual({
      op: 'add_item',
      description: 'installation service',
      unitPrice: 3000,
    });
  });

  it('parses "add Material A for 5000"', () => {
    const ops = regexFallbackParser('add Material A for 5000');
    expect(ops.length).toBe(1);
    expect(ops[0]).toEqual({
      op: 'add_item',
      description: 'Material A',
      unitPrice: 5000,
    });
  });

  it('parses "change Material A to 5.5k"', () => {
    const ops = regexFallbackParser('@PayPal change Material A to 5.5k');
    expect(ops.length).toBe(1);
    expect(ops[0]).toEqual({
      op: 'update_item',
      match: 'Material A',
      unitPrice: 5500,
    });
  });

  it('parses "remove Material B"', () => {
    const ops = regexFallbackParser('@PayPal remove Material B');
    expect(ops.length).toBe(1);
    expect(ops[0]).toEqual({
      op: 'remove_item',
      match: 'Material B',
    });
  });

  it('parses tax "18% GST"', () => {
    const ops = regexFallbackParser('Hey PayPal, add 18% GST');
    expect(ops.length).toBe(1);
    expect(ops[0]).toEqual({
      op: 'set_tax',
      name: 'GST',
      percent: 18,
    });
  });
});

