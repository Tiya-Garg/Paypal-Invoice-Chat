import type { Invoice } from '../domain/types.js';

export interface ChatMessage {
  id: string;
  invoiceId: string;
  seq: number;
  authorRole: 'seller' | 'firm' | 'pp';
  body: string;
  preSend: boolean;
  createdAt: string;
  proposal?: {
    id: string;
    ops: unknown[];
    state: 'open' | 'accepted' | 'declined' | 'expired';
  };
}

export interface InvoiceVersionSummary {
  version: number;
  actor: string;
  summary: string[];
  createdAt: string;
}

export type RealtimeClientMessage =
  | { type: 'chat'; text: string; idempotencyKey?: string }
  | { type: 'edit_item'; id: string; description?: string; unitPrice?: number | string; qty?: number | string }
  | { type: 'remove_item'; id: string }
  | { type: 'send_invoice' }
  | { type: 'approve_invoice' }
  | { type: 'decide_proposal'; proposalId: string; accept: boolean }
  | { type: 'sync_replay'; lastSeq: number };

export type RealtimeServerEvent =
  | {
      type: 'state';
      role: 'seller' | 'firm';
      invoice: Invoice | null; // Null for firm before invoice is sent
      messages: ChatMessage[];
      versions: InvoiceVersionSummary[];
      lastSeq: number;
    }
  | {
      type: 'new_message';
      message: ChatMessage;
    }
  | {
      type: 'invoice_updated';
      invoice: Invoice;
      version: number;
      summaries: string[];
    }
  | {
      type: 'error';
      message: string;
    };

