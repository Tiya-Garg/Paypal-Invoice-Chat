# Operations Runbook: PayPal Invoice Chat

## 1. Stuck Outbox Jobs
If an outbox job is stuck or retrying (`sync_state = 'failed'`):
1. Check application logs for the `module="outbox-worker"` tag.
2. Verify PayPal Sandbox API availability at https://status.paypal.com.
3. If an access token expired prematurely, clear cached token via app restart.
4. If payload error (400 Bad Request):
   - Check if the firm email was changed after the invoice was sent (PayPal restricts primary recipient changes to 2 within 72h).
   - Verify line item prices are strictly non-negative and currencies match.

## 2. Total Mismatch (`sync_state = 'mismatch'`)
When a total mismatch is detected:
- The system automatically locks the invoice from sending to prevent customer confusion.
- Inspect the log entry: `Total mismatch detected! Local calculated total: X, PayPal reported: Y`.
- Verify the tax/discount order:
  - Local engine calculates: Line items -> invoice discount -> tax on discounted taxable amount.
  - Check whether line item tax vs invoice tax configuration in PayPal dashboard aligns.
- Re-run `npm run test tests/domain.test.ts` to assert mathematical invariants.

## 3. Missed Webhooks & Reconciliation
If a customer paid on PayPal but the status hasn't updated:
1. Ensure the webhook endpoint is reachable via HTTPS port 443 (HTTP or alternative ports are dropped by PayPal).
2. Check `paypal_events` table to see if the event arrived but failed signature verification.
3. Trigger manual reconciliation via the outbox worker:
   ```bash
   npm run smoke:sandbox
   ```
   Or query PayPal Invoicing GET `/v2/invoicing/invoices/{id}` to fetch current status.

## 4. Secret Rotation Procedure
When rotating secrets:
1. `PAYPAL_SECRET`:
   - Generate a new REST app secret in PayPal Developer Dashboard.
   - Update `PAYPAL_SECRET` in environment variables.
   - Restart server (`docker compose restart app` or container rolling update).
2. `SESSION_SECRET`:
   - Update `SESSION_SECRET`.
   - Note: Existing active user sessions will expire and require magic link / OTP re-authentication.
3. `PAYPAL_WEBHOOK_ID`:
   - Run `npx tsx scripts/register-webhook.ts <NEW_HTTPS_URL>`.
   - Update `PAYPAL_WEBHOOK_ID` with the printed ID.

