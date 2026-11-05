import { EventEmitter } from 'node:events';
import { childLogger } from '../config/logger.js';
import type { RealtimeServerEvent } from './types.js';

const log = childLogger('pubsub');

export interface PubSubMessage {
  invoiceId: string;
  event: RealtimeServerEvent;
  targetRole?: 'seller' | 'firm'; // If absent, delivered to both
}

export interface PubSubAdapter {
  publish(message: PubSubMessage): Promise<void>;
  subscribe(invoiceId: string, listener: (message: PubSubMessage) => void): () => void;
}

/**
 * In-memory EventEmitter pub/sub adapter with multi-instance / Postgres LISTEN/NOTIFY interface.
 */
export class MemoryPubSubAdapter implements PubSubAdapter {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  async publish(message: PubSubMessage): Promise<void> {
    log.trace({ invoiceId: message.invoiceId, type: message.event.type }, 'Publishing realtime event');
    this.emitter.emit(`invoice:${message.invoiceId}`, message);
  }

  subscribe(invoiceId: string, listener: (message: PubSubMessage) => void): () => void {
    const channel = `invoice:${invoiceId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }
}

export const defaultPubSub = new MemoryPubSubAdapter();
