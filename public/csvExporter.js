/**
 * Invoice CSV Exporter:
 * Generates and downloads RFC-4180 compliant CSV accounting files directly in the browser.
 */
export function exportInvoiceCsv(invoice: {
  number: string;
  currency: string;
  items: Array<{ description: string; qtyMilli: string | bigint; unitMinor: string | bigint }>;
  firmName?: string | null;
}) {
  const headers = ['Invoice Number', 'Recipient', 'Item Description', 'Quantity', 'Unit Price', 'Currency'];
  const rows = invoice.items.map(i => {
    const qty = (Number(i.qtyMilli) / 1000).toFixed(2);
    const price = (Number(i.unitMinor) / 100).toFixed(2);
    return [
      `"${invoice.number}"`,
      `"${invoice.firmName || 'Recipient'}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      `"${qty}"`,
      `"${price}"`,
      `"${invoice.currency}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${invoice.number}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
