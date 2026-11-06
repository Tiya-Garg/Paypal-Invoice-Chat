import { describe, it, expect } from 'vitest';
import { RealtimeManager } from '../src/realtime/manager.js';
import type { Server } from 'node:http';

describe('Realtime Room State Isolation', () => {
  it('creates isolated states between two distinct invoices', () => {
    const mockServer = { on: () => {} } as unknown as Server;
    const manager = new RealtimeManager(mockServer);

    const roomA = manager.getOrCreateRoom('inv-A');
    const roomB = manager.getOrCreateRoom('inv-B');

    roomA.currentSeq = 10;
    roomB.currentSeq = 5;

    expect(roomA.currentSeq).toBe(10);
    expect(roomB.currentSeq).toBe(5);
  });
});

