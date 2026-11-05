import { randomUUID } from 'node:crypto';
import type { Invoice, InvoiceItem } from './types.js';
import { toMinorUnits, toQtyMilli } from './money.js';

export class AmbiguousMatchError extends Error {
  public candidates: InvoiceItem[];
  constructor(query: string, candidates: InvoiceItem[]) {
    super(`Ambiguous item query "${query}". Did you mean: ${candidates.map(c => `"${c.description}"`).join(', ')}?`);
    this.name = 'AmbiguousMatchError';
    this.candidates = candidates;
  }
}

export class ItemNotFoundError extends Error {
  constructor(query: string) {
    super(`No item found matching "${query}"`);
    this.name = 'ItemNotFoundError';
  }
}

export type DomainOp =
  | { op: 'set_firm'; name?: string; email?: string }
  | { op: 'add_item'; description: string; unitPrice: number | string; qty?: number | string }
  | { op: 'update_item'; match: string; description?: string; unitPrice?: number | string; qty?: number | string }
  | { op: 'remove_item'; match: string }
  | { op: 'set_tax'; name: string; percent: number | null }
  | { op: 'set_discount'; kind: 'percent' | 'amount'; value: number | null }
  | { op: 'set_due_days'; days: number }
  | { op: 'set_note'; note: string | null };

/**
 * Resolves an item:
 * 1. Exact ID
 * 2. Exact description (case-insensitive)
 * 3. Unique substring match (case-insensitive)
 * 4. If multiple substring matches -> throws AmbiguousMatchError
 */
export function resolveItem(items: InvoiceItem[], query: string): InvoiceItem {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  // 1. Exact ID match
  const byId = items.find(i => i.id === trimmed);
  if (byId) return byId;

  // 2. Exact description match
  const exactDesc = items.filter(i => i.description.trim().toLowerCase() === lower);
  if (exactDesc.length === 1 && exactDesc[0]) return exactDesc[0];

  // 3. Substring match
  const substrMatches = items.filter(i => i.description.toLowerCase().includes(lower));
  if (substrMatches.length === 1 && substrMatches[0]) {
    return substrMatches[0];
  }
  if (substrMatches.length > 1) {
    throw new AmbiguousMatchError(query, substrMatches);
  }

  throw new ItemNotFoundError(query);
}

/**
 * Pure function: applies an array of ops atomically.
 * Returns the cloned updated invoice + an array of human summaries.
 * If any op fails (e.g. ambiguity, invalid amounts), nothing is changed.
 */
export function applyOps(
  currentInvoice: Invoice,
  ops: DomainOp[],
  actorRole: 'seller' | 'firm' = 'seller',
): { updatedInvoice: Invoice; summaries: string[] } {
  // Deep clone to ensure immutability & atomic rollback on failure
  const invoice: Invoice = {
    ...currentInvoice,
    items: currentInvoice.items.map(item => ({ ...item })),
    tax: currentInvoice.tax ? { ...currentInvoice.tax } : null,
    discount: currentInvoice.discount ? { ...currentInvoice.discount } : null,
  };

  const summaries: string[] = [];

  for (const op of ops) {
    switch (op.op) {
      case 'set_firm': {
        if (actorRole === 'firm') {
          throw new Error('Firm is not allowed to change invoice billing details');
        }
        if (op.name !== undefined) invoice.firmName = op.name.trim();
        if (op.email !== undefined) invoice.firmEmail = op.email.trim();
        summaries.push(`Set recipient to ${invoice.firmName} <${invoice.firmEmail}>`);
        break;
      }

      case 'add_item': {
        const item: InvoiceItem = {
          id: randomUUID().slice(0, 8),
          description: op.description.trim(),
          unitMinor: toMinorUnits(op.unitPrice),
          qtyMilli: op.qty !== undefined ? toQtyMilli(op.qty) : 1000n,
        };
        invoice.items.push(item);
        summaries.push(`Added item "${item.description}"`);
        break;
      }

      case 'update_item': {
        const item = resolveItem(invoice.items, op.match);
        if (op.description !== undefined) item.description = op.description.trim();
        if (op.unitPrice !== undefined) item.unitMinor = toMinorUnits(op.unitPrice);
        if (op.qty !== undefined) item.qtyMilli = toQtyMilli(op.qty);
        summaries.push(`Updated item "${item.description}"`);
        break;
      }

      case 'remove_item': {
        const item = resolveItem(invoice.items, op.match);
        invoice.items = invoice.items.filter(i => i.id !== item.id);
        summaries.push(`Removed item "${item.description}"`);
        break;
      }

      case 'set_tax': {
        if (actorRole === 'firm') {
          throw new Error('Firm is not allowed to adjust tax');
        }
        if (op.percent === null || op.percent <= 0) {
          invoice.tax = null;
          summaries.push('Removed tax');
        } else {
          // BPS: 18% -> 1800n
          const bps = BigInt(Math.round(op.percent * 100));
          invoice.tax = { name: op.name.trim() || 'Tax', percentBps: bps };
          summaries.push(`Set tax ${invoice.tax.name} to ${op.percent}%`);
        }
        break;
      }

      case 'set_discount': {
        if (actorRole === 'firm') {
          throw new Error('Firm is not allowed to adjust discount');
        }
        if (op.value === null || op.value <= 0) {
          invoice.discount = null;
          summaries.push('Removed discount');
        } else if (op.kind === 'percent') {
          const bps = BigInt(Math.round(op.value * 100));
          invoice.discount = { kind: 'percent', percentBps: bps };
          summaries.push(`Set discount to ${op.value}%`);
        } else {
          const minor = toMinorUnits(op.value);
          invoice.discount = { kind: 'amount', amountMinor: minor };
          summaries.push(`Set discount to fixed amount`);
        }
        break;
      }

      case 'set_due_days': {
        if (actorRole === 'firm') {
          throw new Error('Firm cannot change payment due date');
        }
        invoice.dueDays = Math.max(1, Math.round(op.days));
        summaries.push(`Set payment due in ${invoice.dueDays} days`);
        break;
      }

      case 'set_note': {
        invoice.note = op.note ? op.note.trim() : null;
        summaries.push(invoice.note ? `Added note: "${invoice.note}"` : 'Removed note');
        break;
      }

      default: {
        const exhaustiveCheck: never = op;
        throw new Error(`Unsupported domain op: ${(exhaustiveCheck as { op: string }).op}`);
      }
    }
  }

  // Versioning and status transitions according to Phase 2 rules:
  // First successful draft = v1
  // Any edit when status is SENT or APPROVED bumps version and resets approval
  if (invoice.status === 'NONE' && invoice.items.length > 0) {
    invoice.status = 'DRAFT';
    invoice.version = 1;
  } else if (invoice.status === 'SENT' || invoice.status === 'APPROVED') {
    invoice.version += 1;
    invoice.status = 'SENT'; // Resets approval back to SENT
  }

  invoice.updatedAt = new Date();

  return { updatedInvoice: invoice, summaries };
}

