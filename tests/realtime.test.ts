import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { WebSocket } from 'ws';
import { createApp } from '../src/http/app.js';
import { RealtimeManager } from '../src/realtime/manager.js';
import { MemoryPubSubAdapter } from '../src/realtime/pubsub.js';
import { signSession } from '../src/auth/tokens.js';
import { SESSION_COOKIE_NAME } from '../src/auth/middleware.js';
import type { RealtimeServerEvent } from '../src/realtime/types.js';

describe('Realtime WebSocket & Multi-Instance Synchronization', () => {
  let server1: http.Server;
  let server2: http.Server;
  let manager1: RealtimeManager;
  let manager2: RealtimeManager;
  let port1: number;
  let port2: number;
  const sharedPubSub = new MemoryPubSubAdapter();

  const invoiceId = 'test-invoice-101';

  beforeAll(async () => {
    const app1 = createApp();
    server1 = http.createServer(app1);
    manager1 = new RealtimeManager(server1, sharedPubSub);

    const app2 = createApp();
    server2 = http.createServer(app2);
    manager2 = new RealtimeManager(server2, sharedPubSub);

    await new Promise<void>(res => server1.listen(0, () => res()));
    await new Promise<void>(res => server2.listen(0, () => res()));

    port1 = (server1.address() as any).port;
    port2 = (server2.address() as any).port;
  });

  afterAll(async () => {
    await manager1.close();
    await manager2.close();
    await new Promise<void>(res => server1.close(() => res()));
    await new Promise<void>(res => server2.close(() => res()));
  });

  it('connects, delivers initial state, and rejects unauthorized connections', async () => {
    const badWs = new WebSocket(`ws://localhost:${port1}/ws?invoiceId=${invoiceId}`);
    const closeCode = await new Promise<number>(resolve => {
      badWs.on('close', code => resolve(code));
    });
    expect(closeCode).toBe(4001);

    const sellerToken = signSession({
      userId: 'seller-1',
      email: 'seller@test.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const goodWs = new WebSocket(`ws://localhost:${port1}/ws?invoiceId=${invoiceId}`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${sellerToken}` },
    });

    const firstMsg = await new Promise<RealtimeServerEvent>(resolve => {
      goodWs.on('message', data => resolve(JSON.parse(data.toString())));
    });

    expect(firstMsg.type).toBe('state');
    goodWs.close();
  });

  it('fans out chat messages between two separate server instances connected to shared pubsub', async () => {
    const sellerToken = signSession({
      userId: 'seller-1',
      email: 'seller@test.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const firmToken = signSession({
      userId: 'firm-1',
      email: 'firm@test.com',
      role: 'firm',
      invoiceId,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const clientA = new WebSocket(`ws://localhost:${port1}/ws?invoiceId=${invoiceId}`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${sellerToken}` },
    });

    const clientB = new WebSocket(`ws://localhost:${port2}/ws?invoiceId=${invoiceId}`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${firmToken}` },
    });

    await Promise.all([
      new Promise(res => clientA.on('open', res)),
      new Promise(res => clientB.on('open', res)),
    ]);

    const messagePromise = new Promise<RealtimeServerEvent>(resolve => {
      clientB.on('message', data => {
        const parsed = JSON.parse(data.toString()) as RealtimeServerEvent;
        if (parsed.type === 'new_message') {
          resolve(parsed);
        }
      });
    });

    // Send chat from Client A
    clientA.send(
      JSON.stringify({
        type: 'chat',
        text: 'Hello from Server 1',
        idempotencyKey: 'msg-idem-1',
      }),
    );

    const received = await messagePromise;
    expect(received.type).toBe('new_message');
    if (received.type === 'new_message') {
      expect(received.message.body).toBe('Hello from Server 1');
      expect(received.message.authorRole).toBe('seller');
      expect(received.message.seq).toBeGreaterThan(0);
    }

    clientA.close();
    clientB.close();
  });

  it('replays missed events upon reconnect with lastSeq', async () => {
    const sellerToken = signSession({
      userId: 'seller-1',
      email: 'seller@test.com',
      role: 'seller',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const client = new WebSocket(`ws://localhost:${port1}/ws?invoiceId=${invoiceId}`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${sellerToken}` },
    });

    await new Promise(res => client.on('open', res));

    const replayedPromise = new Promise<RealtimeServerEvent>(resolve => {
      client.on('message', data => {
        const parsed = JSON.parse(data.toString()) as RealtimeServerEvent;
        if (parsed.type === 'new_message') {
          resolve(parsed);
        }
      });
    });

    client.send(JSON.stringify({ type: 'sync_replay', lastSeq: 0 }));

    const replayed = await replayedPromise;
    expect(replayed.type).toBe('new_message');
    client.close();
  });
});
