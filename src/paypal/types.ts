// DOC: https://developer.paypal.com/api/invoicing/v2/#invoices

export interface PayPalAmountDetail {
  currency_code: string;
  value: string; // "100.00"
}

export interface PayPalTax {
  name: string;
  percent: string; // e.g. "18" or "18.00"
  amount?: PayPalAmountDetail;
}

export interface PayPalDiscount {
  percent?: string;
  amount?: PayPalAmountDetail;
}

export interface PayPalInvoiceItem {
  id?: string;
  name: string;
  description?: string;
  quantity: string; // e.g. "1" or "2.5"
  unit_amount: PayPalAmountDetail;
  tax?: PayPalTax;
  discount?: PayPalDiscount;
  unit_of_measure?: string;
}

export interface PayPalBillingInfo {
  business_name?: string;
  name?: {
    given_name?: string;
    surname?: string;
  };
  email_address: string;
}

export interface PayPalPrimaryRecipient {
  billing_info: PayPalBillingInfo;
}

export interface PayPalPaymentTerm {
  term_type: 'DUE_ON_DATE_SPECIFIED' | 'DUE_ON_RECEIPT' | 'NET_10' | 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'NO_DUE_DATE';
  due_date?: string; // YYYY-MM-DD
}

export interface PayPalInvoiceDetail {
  invoice_number: string;
  reference?: string;
  invoice_date?: string; // YYYY-MM-DD
  currency_code: string;
  note?: string;
  payment_term?: PayPalPaymentTerm;
  metadata?: {
    create_time?: string;
    last_update_time?: string;
    created_by?: string;
    recipient_view_url?: string;
    invoicer_view_url?: string;
  };
}

export interface PayPalAmountBreakdown {
  item_total?: PayPalAmountDetail;
  discount?: {
    invoice_discount?: PayPalDiscount;
  };
  tax_total?: PayPalAmountDetail;
}

export interface PayPalAmountSummary {
  breakdown?: PayPalAmountBreakdown;
  currency_code?: string;
  value?: string;
}

export interface PayPalInvoicePayload {
  id?: string;
  status?: string;
  detail: PayPalInvoiceDetail;
  invoicer?: {
    name?: { given_name?: string; surname?: string };
    email_address?: string;
  };
  primary_recipients: PayPalPrimaryRecipient[];
  items: PayPalInvoiceItem[];
  amount?: PayPalAmountSummary;
  links?: Array<{ href: string; rel: string; method: string }>;
}
