import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage, Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { childLogger } from '../config/logger.js';
import { verifySession, type SessionPayload } from '../auth/tokens.js';
import { SESSION_COOKIE_NAME } from '../auth/middleware.js';
import { defaultPubSub, type PubSubAdapter } from './pubsub.js';
import type { ChatMessage, RealtimeClientMessage, RealtimeServerEvent } from './types.js';
import type { Invoice } from '../domain/types.js';
import { applyOps } from '../domain/ops.js';

const log = childLogger('realtime');

export interface RoomState {
  invoiceId: string;
  invoice: Invoice;
  messages: ChatMessage[];
  versions: Array<{ version: number; actor: string; summary: string[]; createdAt: string }>;
  currentSeq: number;
  seenIdempotencyKeys: Set<string>;
}

export class RealtimeManager {
  private wss: WebSocketServer;
  private pubsub: PubSubAdapter;
  public rooms = new Map<string, RoomState>();
  private socketSubscriptions = new Map<WebSocket, () => void>();

  constructor(server: Server, pubsub: PubSubAdapter = defaultPubSub) {
    this.pubsub = pubsub;
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private parseCookies(cookieHeader?: string): Record<string, string> {
    const list: Record<string, string> = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0]?.trim();
      const val = parts[1]?.trim();
      if (name && val) list[name] = decodeURIComponent(val);
    });
    return list;
  }

  public getOrCreateRoom(invoiceId: string, initialInvoice?: Invoice): RoomState {
    let room = this.rooms.get(invoiceId);
    if (!room) {
      room = {
        invoiceId,
        invoice: initialInvoice ?? {
          id: invoiceId,
          number: 'INV-0001',
          currency: 'USD',
          firmName: '',
          firmEmail: '',
          items: [],
          tax: null,
          discount: null,
          dueDays: 15,
          note: null,
          status: 'NONE',
          version: 0,
          paypalInvoiceId: null,
          paypalStatus: null,
          recipientViewUrl: null,
          syncState: 'synced',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        messages: [],
        versions: [],
        currentSeq: 0,
        seenIdempotencyKeys: new Set(),
      };
      this.rooms.set(invoiceId, room);
    }
    return room;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url ?? '', 'http://localhost');
    const invoiceId = url.searchParams.get('invoiceId');
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    const session: SessionPayload | null = sessionToken ? verifySession(sessionToken) : null;

    if (!session || !invoiceId) {
      log.warn('Unauthorized WebSocket connection rejected');
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Role check: if firm, session must match invoiceId
    if (session.role === 'firm' && session.invoiceId !== invoiceId) {
      log.warn({ user: session.email, invoiceId }, 'Firm forbidden from accessing different invoice');
      ws.close(4003, 'Forbidden');
      return;
    }

    const room = this.getOrCreateRoom(invoiceId);

    // Subscribe socket to pubsub fanout for this invoice
    const unsubscribe = this.pubsub.subscribe(invoiceId, msg => {
      if (ws.readyState === WebSocket.OPEN) {
        if (!msg.targetRole || msg.targetRole === session.role) {
          // If invoice is in draft/none, firm does not see pre-send messages or draft invoice
          const isPreSend = ['NONE', 'DRAFT'].includes(room.invoice.status);
          if (session.role === 'firm' && isPreSend && msg.event.type === 'new_message' && msg.event.message.preSend) {
            return;
          }
          ws.send(JSON.stringify(msg.event));
        }
      }
    });
    this.socketSubscriptions.set(ws, unsubscribe);

    // Send initial state
    const isPreSend = ['NONE', 'DRAFT'].includes(room.invoice.status);
    const visibleMessages = room.messages.filter(m => session.role === 'seller' || !m.preSend);
    const visibleInvoice = session.role === 'firm' && isPreSend ? null : room.invoice;

    const initialState: RealtimeServerEvent = {
      type: 'state',
      role: session.role,
      invoice: visibleInvoice,
      messages: visibleMessages,
      versions: room.versions,
      lastSeq: room.currentSeq,
    };
    ws.send(JSON.stringify(initialState));

    ws.on('message', async (data: string) => {
      try {
        const msg: RealtimeClientMessage = JSON.parse(data.toString());
        await this.handleClientMessage(room, session, msg, ws);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid message format';
        ws.send(JSON.stringify({ type: 'error', message }));
      }
    });

    ws.on('close', () => {
      const unsub = this.socketSubscriptions.get(ws);
      if (unsub) unsub();
      this.socketSubscriptions.delete(ws);
    });
  }

  private async handleClientMessage(
    room: RoomState,
    session: SessionPayload,
    msg: RealtimeClientMessage,
    ws: WebSocket,
  ) {
    // 1. Idempotency Key check
    if ('idempotencyKey' in msg && msg.idempotencyKey) {
      if (room.seenIdempotencyKeys.has(msg.idempotencyKey)) {
        log.info({ key: msg.idempotencyKey }, 'Ignoring duplicate client message');
        return;
      }
      room.seenIdempotencyKeys.add(msg.idempotencyKey);
    }

    // 2. Replay missed sequence
    if (msg.type === 'sync_replay') {
      const missed = room.messages.filter(m => m.seq > msg.lastSeq);
      for (const m of missed) {
        if (session.role === 'firm' && m.preSend) continue;
        ws.send(JSON.stringify({ type: 'new_message', message: m }));
      }
      return;
    }

    // 3. Chat message
    if (msg.type === 'chat') {
      const isPreSend = ['NONE', 'DRAFT'].includes(room.invoice.status);
      room.currentSeq += 1;
      const chatMsg: ChatMessage = {
        id: randomUUID(),
        invoiceId: room.invoiceId,
        seq: room.currentSeq,
        authorRole: session.role,
        body: msg.text.trim().slice(0, 1000),
        preSend: isPreSend,
        createdAt: new Date().toISOString(),
      };

      room.messages.push(chatMsg);
      await this.pubsub.publish({
        invoiceId: room.invoiceId,
        event: { type: 'new_message', message: chatMsg },
      });
      return;
    }

    // 4. Edit item (Seller only)
    if (msg.type === 'edit_item') {
      if (session.role !== 'seller') {
        throw new Error('Only the seller can make direct invoice edits');
      }
      if (['PAID', 'CANCELLED', 'REFUNDED'].includes(room.invoice.status)) {
        throw new Error('Cannot edit an invoice in closed state');
      }

      const { updatedInvoice, summaries } = applyOps(room.invoice, [
        {
          op: 'update_item',
          match: msg.id,
          description: msg.description,
          unitPrice: msg.unitPrice,
          qty: msg.qty,
        },
      ]);
      room.invoice = updatedInvoice;
      room.versions.push({
        version: updatedInvoice.version,
        actor: session.email,
        summary: summaries,
        createdAt: new Date().toISOString(),
      });

      await this.pubsub.publish({
        invoiceId: room.invoiceId,
        event: {
          type: 'invoice_updated',
          invoice: room.invoice,
          version: room.invoice.version,
          summaries,
        },
      });
      return;
    }

    // 5. Send invoice (Seller only)
    if (msg.type === 'send_invoice') {
      if (session.role !== 'seller') throw new Error('Only the seller can send the invoice');
      if (room.invoice.status !== 'DRAFT') throw new Error('Only draft invoices can be sent');
      if (!room.invoice.firmEmail) throw new Error('Firm email must be specified before sending');

      room.invoice.status = 'SENT';
      room.invoice.version = Math.max(1, room.invoice.version);

      // Unhide pre-send messages or append system announcement
      room.currentSeq += 1;
      const sentAnnouncement: ChatMessage = {
        id: randomUUID(),
        invoiceId: room.invoiceId,
        seq: room.currentSeq,
        authorRole: 'pp',
        body: `Invoice ${room.invoice.number} v${room.invoice.version} sent to ${room.invoice.firmName} via PayPal.`,
        preSend: false,
        createdAt: new Date().toISOString(),
      };
      room.messages.push(sentAnnouncement);

      await this.pubsub.publish({
        invoiceId: room.invoiceId,
        event: {
          type: 'invoice_updated',
          invoice: room.invoice,
          version: room.invoice.version,
          summaries: ['Invoice sent to client'],
        },
      });
      await this.pubsub.publish({
        invoiceId: room.invoiceId,
        event: { type: 'new_message', message: sentAnnouncement },
      });
    }
  }
}
