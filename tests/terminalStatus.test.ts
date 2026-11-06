import { describe, it, expect } from 'vitest';
import { isTerminalStatus } from '../src/domain/terminalStatus.js';

describe('Terminal Status Checker', () => {
  it('correctly identifies paid, cancelled, and refunded statuses as terminal', () => {
    expect(isTerminalStatus('PAID')).toBe(true);
    expect(isTerminalStatus('CANCELLED')).toBe(true);
    expect(isTerminalStatus('REFUNDED')).toBe(true);
    expect(isTerminalStatus('MARKED_AS_PAID')).toBe(true);
  });

  it('identifies draft and sent statuses as non-terminal', () => {
    expect(isTerminalStatus('DRAFT')).toBe(false);
    expect(isTerminalStatus('SENT')).toBe(false);
    expect(isTerminalStatus('APPROVED')).toBe(false);
  });
});
