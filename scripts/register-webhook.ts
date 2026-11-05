import { env } from '../src/config/env.js';

/**
 * Script to automatically register PayPal Webhook on the active REST app
 * and print PAYPAL_WEBHOOK_ID.
 */
async function registerWebhook() {
  const tunnelUrl = process.argv[2];
  if (!tunnelUrl) {
    console.error('Usage: tsx scripts/register-webhook.ts <PUBLIC_HTTPS_TUNNEL_URL>');
    console.error('Example: tsx scripts/register-webhook.ts https://your-tunnel.ngrok-free.app');
    process.exit(1);
  }

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) {
    console.error('❌ Error: PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set in your .env file.');
    process.exit(1);
  }

  console.log('Authenticating with PayPal Sandbox...');
  const auth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${env.PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    console.error('Failed to authenticate:', await tokenRes.text());
    process.exit(1);
  }

  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const webhookUrl = `${tunnelUrl.replace(/\/$/, '')}/webhooks/paypal`;

  console.log(`Registering webhook for url: ${webhookUrl}`);
  const createRes = await fetch(`${env.PAYPAL_BASE}/v1/notifications/webhooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      event_types: [
        { name: 'INVOICING.INVOICE.CREATED' },
        { name: 'INVOICING.INVOICE.SENT' },
        { name: 'INVOICING.INVOICE.UPDATED' },
        { name: 'INVOICING.INVOICE.PAID' },
        { name: 'INVOICING.INVOICE.CANCELLED' },
        { name: 'INVOICING.INVOICE.REFUNDED' },
      ],
    }),
  });

  if (!createRes.ok) {
    console.error('Failed to create webhook:', await createRes.text());
    process.exit(1);
  }

  const result = (await createRes.json()) as { id: string };
  console.log('================================================================');
  console.log('✅ PayPal Webhook Registered Successfully!');
  console.log(`PAYPAL_WEBHOOK_ID=${result.id}`);
  console.log('Add the above line to your .env file to verify incoming webhook signatures.');
  console.log('================================================================');
}

registerWebhook().catch(err => {
  console.error(err);
  process.exit(1);
});
