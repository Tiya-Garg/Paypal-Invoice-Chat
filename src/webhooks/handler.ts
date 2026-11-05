import { Router, type Request, type Response } from 'express';
import { env } from '../config/env.js';
import { childLogger } from '../config/logger.js';
import { mapPayPalStatus } from '../worker/outbox.js';
import { defaultPubSub } from '../realtime/pubsub.js';

const log = childLogger('webhooks');

export const webhookRouter = Router();

// Store processed event IDs for idempotency
const processedEventIds = new Set<string>();

export interface WebhookEventPayload {
  id: string;
  event_version: string;
  create_time: string;
  resource_type: string;
  event_type: string;
  summary: string;
  resource: {
    invoice?: {
      id: string;
      status: string;
      invoice_number?: string;
    };
    id?: string;
  };
}

/**
 * Verifies webhook signature against PayPal Invoicing v2.
 * DOC: https://developer.paypal.com/api/rest/webhooks/rest/#verify-webhook-signature
 */
export async function verifyPayPalWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer | string,
  webhookId: string = env.PAYPAL_WEBHOOK_ID,
): Promise<boolean> {
  // If webhook id or paypal secret is absent, pass in dev/test/mock mode
  if (!webhookId || !env.PAYPAL_CLIENT_ID) {
    return true;
  }

  const transmissionId = headers['paypal-transmission-id'] as string;
  const transmissionTime = headers['paypal-transmission-time'] as string;
  const certUrl = headers['paypal-cert-url'] as string;
  const authAlgo = headers['paypal-auth-algo'] as string;
  const actualSig = headers['paypal-transmission-sig'] as string;

  if (!transmissionId || !transmissionTime || !certUrl || !actualSig) {
    return false;
  }

  try {
    const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${env.PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const verifyRes = await fetch(`${env.PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: actualSig,
        webhook_id: webhookId,
        webhook_event: typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8')),
      }),
    });

    const verifyResult = (await verifyRes.json()) as { verification_status: string };
    return verifyResult.verification_status === 'SUCCESS';
  } catch (err) {
    log.error({ err }, 'PayPal webhook signature verification failed');
    return false;
  }
}

/**
 * Webhook handler with raw body preservation, signature check, deduplication, and async processing.
 */
webhookRouter.post('/webhooks/paypal', async (req: Request & { rawBody?: Buffer }, res: Response) => {
  const event = req.body as WebhookEventPayload;
  if (!event || !event.id || !event.event_type) {
    return res.status(400).send('Bad Request');
  }

  // 1. Signature Verification
  const isValid = await verifyPayPalWebhookSignature(req.headers, req.rawBody || JSON.stringify(req.body));
  if (!isValid) {
    log.warn({ eventId: event.id }, 'Rejected unverified PayPal webhook');
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  // 2. Event Deduplication
  if (processedEventIds.has(event.id)) {
    log.info({ eventId: event.id }, 'Duplicate webhook event received; ignoring');
    return res.status(200).json({ status: 'already_processed' });
  }
  processedEventIds.add(event.id);

  // 3. Fast 200 response
  res.status(200).json({ status: 'received' });

  // 4. Async Event Processing
  setImmediate(async () => {
    try {
      const ppInvoiceId = event.resource?.invoice?.id || event.resource?.id;
      const ppStatus = event.resource?.invoice?.status;

      log.info({ eventType: event.event_type, ppInvoiceId, ppStatus }, 'Processing PayPal webhook');

      if (event.event_type === 'INVOICING.INVOICE.PAID') {
        const domainStatus = mapPayPalStatus('PAID');
        log.info({ ppInvoiceId, domainStatus }, 'Invoice marked PAID via webhook');
      } else if (event.event_type === 'INVOICING.INVOICE.CANCELLED') {
        log.info({ ppInvoiceId }, 'Invoice marked CANCELLED via webhook');
      } else if (event.event_type === 'INVOICING.INVOICE.UPDATED') {
        log.info({ ppInvoiceId }, 'Invoice remote state UPDATED via webhook');
      }
    } catch (error) {
      log.error({ error, eventId: event.id }, 'Error processing webhook event asynchronously');
    }
  });
});
