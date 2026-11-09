/**
 * Payment Status Banner Component:
 * Renders prominent visual banner according to invoice state:
 * DRAFT, SENT, PAID, or CANCELLED, with PayPal deep link and recipient view URL.
 */
export function renderStatusBanner(invoice: {
  status: string;
  paypalStatus?: string | null;
  paypalInvoiceId?: string | null;
  recipientViewUrl?: string | null;
}): HTMLElement {
  const banner = document.createElement('div');
  banner.className = `status-banner banner-${invoice.status.toLowerCase()}`;

  let title = 'Draft Negotiation';
  let desc = 'This invoice is in private draft mode between seller and buyer.';
  let iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>';

  if (invoice.status === 'PAID') {
    title = 'Paid in Full';
    desc = 'Payment has been confirmed via PayPal webhook. Invoice is locked against further edits.';
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (invoice.status === 'SENT') {
    title = 'Sent to Recipient';
    desc = 'Invoice is published and awaiting buyer payment.';
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
  } else if (invoice.status === 'CANCELLED') {
    title = 'Invoice Cancelled';
    desc = 'This invoice has been voided / cancelled.';
    iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
  }

  banner.innerHTML = `
    <div class="banner-icon">${iconSvg}</div>
    <div class="banner-body">
      <div class="banner-title">${title}</div>
      <div class="banner-desc">${desc}</div>
    </div>
    ${
      invoice.recipientViewUrl
        ? `<a href="${invoice.recipientViewUrl}" target="_blank" rel="noopener noreferrer" class="banner-link-btn">View on PayPal &rarr;</a>`
        : ''
    }
  `;

  return banner;
}
