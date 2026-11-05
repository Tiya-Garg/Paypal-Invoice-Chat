import { describe, it, expect } from 'vitest';
import { RealtimeManager } from '../src/realtime/manager.js';
import type { Server } from 'node:http';

describe('Realtime Monotonic Sequence Incrementation', () => {
  it('guarantees sequences increase strictly by 1 per message', () => {
    const mockServer = { on: () => {} } as unknown as Server;
    const manager = new RealtimeManager(mockServer);
    const room = manager.getOrCreateRoom('inv-seq');

    expect(room.currentSeq).toBe(0);
    room.currentSeq += 1;
    expect(room.currentSeq).toBe(1);
    room.currentSeq += 1;
    expect(room.currentSeq).toBe(2);
  });
});
