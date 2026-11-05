import { describe, it, expect } from 'vitest';
import { regexFallbackParser } from '../src/llm/fallback.js';

describe('Fallback Parser Resiliency on Dirty Inputs', () => {
  it('strips redundant punctuation and leading whitespace', () => {
    const ops = regexFallbackParser('   @PayPal,   add 5k for consulting service!  ');
    expect(ops.length).toBe(1);
    expect(ops[0]?.op).toBe('add_item');
  });

  it('returns empty array when user input is purely conversational', () => {
    const ops = regexFallbackParser('Hey PayPal, how is the weather today?');
    expect(ops.length).toBe(0);
  });
});
