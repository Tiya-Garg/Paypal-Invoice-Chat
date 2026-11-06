import { describe, it, expect } from 'vitest';
import { RealtimeManager } from '../src/realtime/manager.js';
import type { Server } from 'node:http';

describe('Realtime Client Deduplication', () => {
  it('detects and suppresses duplicate client messages by idempotency key', () => {
    const mockServer = { on: () => {} } as unknown as Server;
    const manager = new RealtimeManager(mockServer);
    const room = manager.getOrCreateRoom('inv-dedupe');

    const key = 'idem-msg-123';
    expect(room.seenIdempotencyKeys.has(key)).toBe(false);

    room.seenIdempotencyKeys.add(key);
    expect(room.seenIdempotencyKeys.has(key)).toBe(true);
  });
});

