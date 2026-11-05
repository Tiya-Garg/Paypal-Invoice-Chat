# PayPal Invoice Chat

A production-grade, collaborative real-time invoice application built on the **PayPal Invoicing v2 API** and Anthropic AI assistant.

> **Disclaimer**: This is an independent application built using PayPal's public developer APIs. It is not affiliated with, authorized, or sponsored by PayPal, Inc.

---

## Architecture

```
React/Vite client ── HTTPS + WS ── Node/TS API ── Postgres (state, versions, outbox, events)
                                       │  ├─ Anthropic API  (command → ops, tool use)
                                       │  └─ PayPal Invoicing v2 (create/send/update/get/cancel)
                  PayPal webhooks ─────┘      worker: outbox sync + reconciliation
```

---

## Key Features

1. **AI Natural Language Invoicing**: Tag `@PayPal` or say *"Hey PayPal, quote 5k for Material A and 8k for Material B to Firm X"*.
2. **Collaborative Invoice Negotiation**: Seller and Firm converse in one shared thread attached to the invoice. Firm's `@PayPal` requests automatically create structured **proposals** for the seller to approve or decline.
3. **No Divergence Guarantee**: All money is computed in integer minor units (cents/paise). After every sync, PayPal's remote computed total is asserted against local calculation; any mismatch halts sending and flags `sync_state=mismatch`.
4. **PayPal-Compliant Flow**: Invoices are created as drafts, sent through PayPal, revised via GET &rarr; modify &rarr; PUT full replacement, and paid directly on PayPal via `recipient_view_url`.
5. **Secure Realtime**: Monotonic sequence replay (`seq`), WebSockets authenticated via httpOnly session cookies, CSRF protection, and pub/sub multi-server fanout.

---

## Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP & WebSocket server port | `3000` |
| `NODE_ENV` | Environment (`development`, `test`, `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/paypal_invoice_chat` |
| `SESSION_SECRET` | Secret key for signing sessions and magic links | *(auto-validated minimum 16 chars)* |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox REST App Client ID | `""` *(runs in simulated mock if empty)* |
| `PAYPAL_SECRET` | PayPal Sandbox REST App Secret | `""` |
| `PAYPAL_BASE` | PayPal API Base URL | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_WEBHOOK_ID` | Registered Webhook ID for signature verification | `""` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `""` *(runs deterministic regex fallback if empty)* |
| `MODEL` | Anthropic model for tool-use parsing | `claude-3-7-sonnet-20250219` |

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database & Migrations
```bash
docker compose up -d postgres
npm run migrate:up
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Test Suite
```bash
# Run all unit, property, and integration tests
npm test

# Run Playwright E2E collaborative test
npx playwright test

# Run PayPal Sandbox Smoke Test (requires PayPal credentials)
npm run smoke:sandbox
```

---

## Operational Runbooks & Decisions
- See [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for dealing with stuck outbox jobs, total mismatches, and secret rotation.
- See [`docs/DECISIONS.md`](docs/DECISIONS.md) for architectural records.
- See [`docs/HUMAN_TODO.md`](docs/HUMAN_TODO.md) for developer dashboard setup.
