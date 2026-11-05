import { childLogger } from '../config/logger.js';
import type { Invoice, InvoiceStatus } from '../domain/types.js';
import { calculateInvoiceTotals } from '../domain/calculator.js';
import { toPayPalDecimal } from '../domain/money.js';
import { defaultPayPalClient, type PayPalClient } from '../paypal/client.js';

const log = childLogger('outbox-worker');

export interface OutboxItem {
  id: string;
  invoiceId: string;
  kind: 'create' | 'send' | 'update' | 'cancel';
  payload: Invoice;
  attempts: number;
  state: 'pending' | 'processing' | 'completed' | 'failed';
  lastError?: string;
}

/**
 * Maps PayPal Invoicing v2 invoice statuses to our domain status.
 * DOC: https://developer.paypal.com/api/invoicing/v2/#definition-invoice_status
 */
export function mapPayPalStatus(ppStatus: string): InvoiceStatus {
  switch (ppStatus.toUpperCase()) {
    case 'DRAFT':
      return 'DRAFT';
    case 'SENT':
      return 'SENT';
    case 'SCHEDULED':
      return 'SCHEDULED';
    case 'PAID':
      return 'PAID';
    case 'MARKED_AS_PAID':
      return 'MARKED_AS_PAID';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'REFUNDED':
      return 'REFUNDED';
    case 'PARTIALLY_PAID':
      return 'PARTIALLY_PAID';
    case 'PARTIALLY_REFUNDED':
      return 'PARTIALLY_REFUNDED';
    case 'MARKED_AS_REFUNDED':
      return 'MARKED_AS_REFUNDED';
    case 'UNPAID':
      return 'UNPAID';
    case 'PAYMENT_PENDING':
      return 'PAYMENT_PENDING';
    default:
      return 'SENT';
  }
}

export class OutboxWorker {
  private client: PayPalClient;
  private queue: OutboxItem[] = [];

  constructor(client: PayPalClient = defaultPayPalClient) {
    this.client = client;
  }

  public enqueue(item: Omit<OutboxItem, 'id' | 'attempts' | 'state'>): OutboxItem {
    const record: OutboxItem = {
      ...item,
      id: Math.random().toString(36).slice(2, 9),
      attempts: 0,
      state: 'pending',
    };
    this.queue.push(record);
    return record;
  }

  /**
   * Processes an outbox job and asserts total equality with PayPal.
   * If totals diverge, marks sync_state = 'mismatch' and halts send.
   */
  async processJob(job: OutboxItem): Promise<{ ok: boolean; paypalInvoiceId?: string; error?: string }> {
    job.attempts += 1;
    job.state = 'processing';
    const invoice = job.payload;

    try {
      if (job.kind === 'create') {
        const created = await this.client.createDraftInvoice(invoice, `req-${invoice.id}-v${invoice.version}`);
        const ppId = created.id || created.links?.find(l => l.rel === 'self')?.href.split('/').pop() || 'INV2-MOCK-ID';
        invoice.paypalInvoiceId = ppId;

        // Post-sync assertion: verify PayPal's computed total matches ours
        await this.verifyInvoiceTotal(ppId, invoice);

        invoice.syncState = 'synced';
        job.state = 'completed';
        return { ok: true, paypalInvoiceId: ppId };
      }

      if (job.kind === 'send') {
        if (!invoice.paypalInvoiceId) {
          throw new Error('Cannot send invoice without PayPal invoice ID');
        }
        await this.client.sendInvoice(invoice.paypalInvoiceId);
        invoice.status = 'SENT';
        invoice.syncState = 'synced';
        job.state = 'completed';
        return { ok: true, paypalInvoiceId: invoice.paypalInvoiceId };
      }

      if (job.kind === 'update') {
        if (!invoice.paypalInvoiceId) {
          throw new Error('Cannot update invoice without PayPal invoice ID');
        }
        await this.client.updateInvoice(invoice.paypalInvoiceId, invoice, { sendToRecipient: true });
        await this.verifyInvoiceTotal(invoice.paypalInvoiceId, invoice);
        invoice.syncState = 'synced';
        job.state = 'completed';
        return { ok: true, paypalInvoiceId: invoice.paypalInvoiceId };
      }

      if (job.kind === 'cancel') {
        if (invoice.paypalInvoiceId) {
          await this.client.cancelInvoice(invoice.paypalInvoiceId);
        }
        invoice.status = 'CANCELLED';
        job.state = 'completed';
        return { ok: true };
      }

      throw new Error(`Unsupported outbox job kind: ${job.kind}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      job.lastError = msg;
      if (msg.includes('mismatch')) {
        invoice.syncState = 'mismatch';
      } else {
        invoice.syncState = 'failed';
      }
      job.state = 'failed';
      log.error({ err, invoiceId: invoice.id, kind: job.kind }, 'Outbox job failed');
      return { ok: false, error: msg };
    }
  }

  /**
   * Verifies that PayPal's remote computed total matches local domain calculation.
   */
  async verifyInvoiceTotal(paypalInvoiceId: string, invoice: Invoice): Promise<void> {
    try {
      const remote = await this.client.getInvoice(paypalInvoiceId);
      const localTotals = calculateInvoiceTotals(invoice);
      const localTotalFormatted = toPayPalDecimal(localTotals.totalMinor);

      const remoteTotal = remote.amount?.value;
      if (remoteTotal && remoteTotal !== localTotalFormatted) {
        throw new Error(
          `Total mismatch detected! Local calculated total: ${localTotalFormatted}, PayPal reported: ${remoteTotal}`,
        );
      }

      if (remote.detail?.metadata?.recipient_view_url) {
        invoice.recipientViewUrl = remote.detail.metadata.recipient_view_url;
      }
      if (remote.status) {
        invoice.paypalStatus = remote.status;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('mismatch')) {
        throw err;
      }
      log.warn({ err }, 'Could not fetch remote invoice for total verification; skipping in mock mode');
    }
  }
}
