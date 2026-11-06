import type { Invoice } from '../domain/types.js';

export class ReconciliationWorker {
  /**
   * Reconciles local non-final invoice states with PayPal remote API.
   * Runs every 10 minutes to fix status drift if a webhook event was missed.
   */
  public async reconcileInvoice(
    localInvoice: Invoice,
    fetchRemoteStatus: (paypalInvoiceId: string) => Promise<string | null>,
  ): Promise<{ updated: boolean; newStatus?: string }> {
    // If invoice is already paid, cancelled or refunded, no reconciliation needed
    if (['PAID', 'CANCELLED', 'REFUNDED', 'MARKED_AS_PAID'].includes(localInvoice.status)) {
      return { updated: false };
    }

    if (!localInvoice.paypalInvoiceId) {
      return { updated: false };
    }

    const remoteStatus = await fetchRemoteStatus(localInvoice.paypalInvoiceId);
    if (remoteStatus && remoteStatus !== localInvoice.paypalStatus) {
      localInvoice.paypalStatus = remoteStatus;
      if (remoteStatus.toUpperCase() === 'PAID') {
        localInvoice.status = 'PAID';
        return { updated: true, newStatus: 'PAID' };
      }
      if (remoteStatus.toUpperCase() === 'CANCELLED') {
        localInvoice.status = 'CANCELLED';
        return { updated: true, newStatus: 'CANCELLED' };
      }
    }

    return { updated: false };
  }
}

