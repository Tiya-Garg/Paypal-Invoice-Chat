export type Currency = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AUD' | 'CAD';

/**
 * Money representation:
 * Always strictly integer minor units (e.g. cents, pence, paise).
 * No floats permitted in domain calculations.
 */
export interface Money {
  minor: bigint; // Minor units (e.g. 1000 = $10.00)
  currency: Currency;
}

export interface InvoiceItem {
  id: string;
  description: string;
  qtyMilli: bigint; // Quantity in milli-units (e.g., 1000 = 1.000)
  unitMinor: bigint; // Unit amount in minor units
}

export type Discount =
  | { kind: 'percent'; percentBps: bigint } // BPS: e.g. 1000n = 10.00%
  | { kind: 'amount'; amountMinor: bigint };

export interface Tax {
  name: string;
  percentBps: bigint; // e.g. 1800n = 18.00%
}

export type InvoiceStatus =
  | 'NONE'
  | 'DRAFT'
  | 'SENT'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PAID'
  | 'MARKED_AS_PAID'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_PAID'
  | 'PARTIALLY_REFUNDED'
  | 'MARKED_AS_REFUNDED'
  | 'UNPAID'
  | 'PAYMENT_PENDING';

export type SyncState = 'synced' | 'syncing' | 'failed' | 'mismatch';

export interface Invoice {
  id: string;
  number: string;
  currency: Currency;
  firmName: string;
  firmEmail: string;
  items: InvoiceItem[];
  tax: Tax | null;
  discount: Discount | null;
  dueDays: number;
  note: string | null;
  status: InvoiceStatus;
  version: number;
  paypalInvoiceId: string | null;
  paypalStatus: string | null;
  recipientViewUrl: string | null;
  syncState: SyncState;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceTotals {
  subtotalMinor: bigint;
  discountMinor: bigint;
  taxMinor: bigint;
  totalMinor: bigint;
}

