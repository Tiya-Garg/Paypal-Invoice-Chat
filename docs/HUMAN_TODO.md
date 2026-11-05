# Manual Steps Remaining for Production Deployment

Before going live with real merchant accounts, perform the following manual setup in the developer dashboard:

1. **PayPal Sandbox REST App**:
   - Log into [PayPal Developer Dashboard](https://developer.paypal.com).
   - Under **Apps & Credentials**, select the Sandbox business merchant account.
   - Copy `Client ID` into `PAYPAL_CLIENT_ID`.
   - Copy `Secret` into `PAYPAL_SECRET`.

2. **Public HTTPS Tunnel / Webhook URL**:
   - Start your public tunnel (e.g. ngrok or Cloudflare Tunnel) pointing to local port 3000:
     ```bash
     ngrok http 3000
     ```
   - Register your webhook using the automated script:
     ```bash
     npx tsx scripts/register-webhook.ts https://your-domain.ngrok-free.app
     ```
   - Copy the printed `PAYPAL_WEBHOOK_ID` into your `.env` file.

3. **Anthropic API**:
   - Provide `ANTHROPIC_API_KEY` in `.env` from your Anthropic console.

4. **Database (PostgreSQL)**:
   - Ensure PostgreSQL is running locally or via Docker:
     ```bash
     docker compose up -d postgres
     ```
   - Run migrations:
     ```bash
     npm run migrate:up
     ```

5. **Sandbox Smoke Test Verification**:
   - Execute the end-to-end sandbox verification:
     ```bash
     npm run smoke:sandbox
     ```
