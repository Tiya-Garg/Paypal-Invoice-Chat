import { describe, it, expect } from 'vitest';
import { generateClientRequestId } from '../src/realtime/requestId.js';

describe('Client Request ID Generator', () => {
  it('generates unique request IDs with req- prefix', () => {
    const id1 = generateClientRequestId();
    const id2 = generateClientRequestId();

    expect(id1.startsWith('req-')).toBe(true);
    expect(id2.startsWith('req-')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
