# PayPal Invoice Chat

Create and negotiate invoices **inside one chat thread**. Tell an assistant who to bill and for what, review the draft, send it, and keep editing it live by tagging `@PayPal` in the conversation.

> Independent prototype. Not affiliated with or endorsed by PayPal. It uses the public PayPal Invoicing API (sandbox by default).

```
Seller:  Hey PayPal, quote 5k for material A and 8k for material B to Firm X (ap@firmx.com)
PayPal:  Added Material A ($5,000.00). Added Material B ($8,000.00). Total $13,000.00.
Seller:  [reviews draft] → Send from PayPal
Firm:    @PayPal please add 2k for on-site training
PayPal:  Sent to the seller for approval.
Seller:  [Approve change] → invoice v2 updates live for both sides
Seller:  @PayPal add 3k for installation service, 18% GST
```

## Features
- **Natural-language edits.** Claude (tool use) converts chat into structured ops: add / update / remove item, tax, discount, due days, firm + email. Understands `5k`, `1.5L`, `1.5 lakh`.
- **Real-time sync.** WebSocket rooms; both parties see changes instantly with changed rows highlighted.
- **Approval flow.** Seller edits apply immediately. Firm requests become proposals the seller approves or declines.
- **Versioned and audited.** Edits are atomic (all or nothing). Every change after sending bumps the version, resets approval, and is logged.
- **Role-scoped links.** Seller and firm get separate tokenised links. The firm never sees the draft or the pre-send chat.
- **PayPal Invoicing API v2.** Creates, sends and revises the invoice from PayPal; a webhook marks it paid. Runs in **mock mode** when no PayPal keys are set.

## Architecture
```
Browser (seller)  ─┐                      ┌─ Anthropic API  (chat text → edit ops)
                   ├─ WebSocket ─ Node ───┤
Browser (firm)    ─┘     (ws)    Express   └─ PayPal Invoicing v2 (create/send/update)
                                  │  ▲
                                  ▼  └── POST /webhooks/paypal (INVOICE.PAID)
                           in-memory store (swap for Postgres)
```
- `server.js`: domain logic (`apply`, `commit`), LLM parsing, PayPal client, rooms, WebSocket handlers
- `public/index.html`: single-file client (invoice view, chat, role-aware actions)

## Run locally
Requires Node 20.6+.
```bash
npm install
cp .env.example .env     # add ANTHROPIC_API_KEY
npm start                # http://localhost:3000
```
Open `/`, create a thread, then open the **firm link** in a second browser or incognito window.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Required. Parses chat commands. |
| `MODEL` | Optional. Defaults to `claude-sonnet-4-6`. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET` | Optional. Enables real PayPal sandbox invoices. |
| `PAYPAL_BASE` | Defaults to the sandbox URL. |

Webhook testing locally: expose the server with a tunnel and register `/webhooks/paypal` for `INVOICING.INVOICE.PAID` in the PayPal developer dashboard.

## Known limitations
- In-memory storage, no real authentication (link tokens only).
- PayPal payload field names (invoice-level discount, updating an already-sent invoice) need checking against your sandbox.
- Webhook signature verification is a TODO.
- LLM parsing has no fallback and no rate limiting.

## Roadmap
- [ ] Postgres persistence and proper auth
- [ ] Verify PayPal webhook signatures
- [ ] Undo / revert to any version from history
- [ ] Quantities, per-item tax, attachments, PDF export
- [ ] Voice trigger ("Hey PayPal")
- [ ] Confirm-before-apply for large or ambiguous edits

## License
MIT
