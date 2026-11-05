import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import type { Invoice } from '../domain/types.js';
import { toPayPalDecimal, toPayPalQuantity } from '../domain/money.js';
import type { PayPalInvoicePayload } from './types.js';

const log = childLogger('paypal-client');

export class PayPalApiError extends Error {
  public statusCode: number;
  public details?: unknown;
  constructor(message: string, statusCode: number, details?: unknown) {
    super(`PayPal API Error [${statusCode}]: ${message}`);
    this.name = 'PayPalApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Builds PayPal Invoicing v2 compliant payload from our internal Invoice model.
 * DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_create
 */
export function buildPayPalInvoicePayload(invoice: Invoice): PayPalInvoicePayload {
  const currency_code = invoice.currency;
  const dueDate = new Date(Date.now() + invoice.dueDays * 86400000).toISOString().slice(0, 10);
  const invoiceDate = new Date().toISOString().slice(0, 10);

  const payload: PayPalInvoicePayload = {
    detail: {
      invoice_number: invoice.number,
      invoice_date: invoiceDate,
      currency_code,
      note: invoice.note || undefined,
      payment_term: {
        term_type: 'DUE_ON_DATE_SPECIFIED',
        due_date: dueDate,
      },
    },
    primary_recipients: [
      {
        billing_info: {
          business_name: invoice.firmName || undefined,
          email_address: invoice.firmEmail,
        },
      },
    ],
    items: invoice.items.map(item => {
      const lineItem: PayPalInvoicePayload['items'][number] = {
        name: item.description,
        quantity: toPayPalQuantity(item.qtyMilli),
        unit_amount: {
          currency_code,
          value: toPayPalDecimal(item.unitMinor),
        },
      };

      if (invoice.tax) {
        lineItem.tax = {
          name: invoice.tax.name,
          percent: (Number(invoice.tax.percentBps) / 100).toFixed(2).replace(/\.00$/, ''),
        };
      }

      return lineItem;
    }),
  };

  if (invoice.discount) {
    payload.amount = {
      breakdown: {
        discount: {
          invoice_discount:
            invoice.discount.kind === 'percent'
              ? { percent: (Number(invoice.discount.percentBps) / 100).toFixed(2).replace(/\.00$/, '') }
              : { amount: { currency_code, value: toPayPalDecimal(invoice.discount.amountMinor) } },
        },
      },
    };
  }

  return payload;
}

export class PayPalClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(options?: { baseUrl?: string; clientId?: string; clientSecret?: string }) {
    this.baseUrl = options?.baseUrl || env.PAYPAL_BASE;
    this.clientId = options?.clientId || env.PAYPAL_CLIENT_ID;
    this.clientSecret = options?.clientSecret || env.PAYPAL_SECRET;
  }

  // DOC: https://developer.paypal.com/api/rest/authentication/
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.cachedToken.expiresAt - 60000) {
      return this.cachedToken.token;
    }

    if (!this.clientId || !this.clientSecret) {
      log.debug('PayPal credentials absent: using simulated sandbox token');
      this.cachedToken = { token: 'mock-sandbox-token', expiresAt: now + 3600 * 1000 };
      return this.cachedToken.token;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      throw new PayPalApiError(`OAuth authentication failed: ${err}`, res.status);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return data.access_token;
  }

  /**
   * Executes fetch with token injection, retry on 429/5xx, and idempotency header on mutating requests.
   */
  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      requestId?: string;
    } = {},
  ): Promise<T> {
    const { method = 'GET', body, requestId } = options;
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (requestId && method === 'POST') {
      headers['PayPal-Request-Id'] = requestId;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (res.status === 429 || res.status >= 500) {
          if (attempts < maxAttempts) {
            const backoffMs = Math.pow(2, attempts) * 200 + Math.random() * 100;
            log.warn({ status: res.status, endpoint, backoffMs }, 'Retrying PayPal request after backoff');
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
        }

        const text = await res.text();
        const json = text ? JSON.parse(text) : null;

        if (!res.ok) {
          throw new PayPalApiError(
            json?.message || `Request failed with status ${res.status}`,
            res.status,
            json,
          );
        }

        return json as T;
      } catch (err: unknown) {
        if (attempts >= maxAttempts || (err instanceof PayPalApiError && err.statusCode < 500 && err.statusCode !== 429)) {
          throw err;
        }
      }
    }

    throw new PayPalApiError('Max retries exceeded', 504);
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_create
  async createDraftInvoice(invoice: Invoice, requestId?: string): Promise<PayPalInvoicePayload> {
    const payload = buildPayPalInvoicePayload(invoice);
    return this.request<PayPalInvoicePayload>('/v2/invoicing/invoices', {
      method: 'POST',
      body: payload,
      requestId,
    });
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_send
  async sendInvoice(paypalInvoiceId: string, options?: { sendToRecipient?: boolean; sendToInvoicer?: boolean }) {
    return this.request<{ href: string }>(`/v2/invoicing/invoices/${paypalInvoiceId}/send`, {
      method: 'POST',
      body: {
        send_to_recipient: options?.sendToRecipient ?? true,
        send_to_invoicer: options?.sendToInvoicer ?? false,
      },
    });
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_get
  async getInvoice(paypalInvoiceId: string): Promise<PayPalInvoicePayload> {
    return this.request<PayPalInvoicePayload>(`/v2/invoicing/invoices/${paypalInvoiceId}`);
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_put
  async updateInvoice(
    paypalInvoiceId: string,
    invoice: Invoice,
    options?: { sendToRecipient?: boolean },
  ): Promise<PayPalInvoicePayload> {
    const payload = buildPayPalInvoicePayload(invoice);
    const query = options?.sendToRecipient ? '?send_to_recipient=true' : '';
    return this.request<PayPalInvoicePayload>(`/v2/invoicing/invoices/${paypalInvoiceId}${query}`, {
      method: 'PUT',
      body: payload,
    });
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_cancel
  async cancelInvoice(paypalInvoiceId: string, reason = 'Invoice revision or cancellation') {
    return this.request<void>(`/v2/invoicing/invoices/${paypalInvoiceId}/cancel`, {
      method: 'POST',
      body: {
        subject: 'Invoice cancelled',
        note: reason,
        send_to_recipient: true,
      },
    });
  }

  // DOC: https://developer.paypal.com/api/invoicing/v2/#invoices_payments
  async recordPayment(paypalInvoiceId: string, amount: string, currency: string) {
    return this.request<{ payment_id: string }>(`/v2/invoicing/invoices/${paypalInvoiceId}/payments`, {
      method: 'POST',
      body: {
        method: 'OTHER',
        amount: { currency_code: currency, value: amount },
      },
    });
  }
}

export const defaultPayPalClient = new PayPalClient();
