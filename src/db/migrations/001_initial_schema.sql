-- Phase 1 Initial Schema
-- 4. Data model (Postgres)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role_default TEXT NOT NULL DEFAULT 'seller',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  firm_name TEXT NOT NULL DEFAULT '',
  firm_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INT NOT NULL DEFAULT 0,
  due_days INT NOT NULL DEFAULT 15,
  tax_name TEXT NULL,
  tax_bps INT NULL, -- Basis points (e.g. 1800 for 18%)
  discount_kind TEXT NULL, -- 'percent' | 'amount'
  discount_value BIGINT NULL, -- BPS for percent, minor units for amount
  paypal_invoice_id TEXT UNIQUE NULL,
  paypal_status TEXT NULL,
  recipient_view_url TEXT NULL,
  sync_state TEXT NOT NULL DEFAULT 'synced', -- 'synced' | 'syncing' | 'failed' | 'mismatch'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_seller_number UNIQUE(seller_id, number)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  qty_milli BIGINT NOT NULL DEFAULT 1000, -- 1.000 items in milli-units
  unit_minor BIGINT NOT NULL DEFAULT 0, -- Unit price in minor units (e.g. cents/paise)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  summary TEXT[] NOT NULL DEFAULT '{}',
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invoice_version UNIQUE(invoice_id, version)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  seq BIGSERIAL,
  author_role TEXT NOT NULL, -- 'seller' | 'firm' | 'pp'
  body TEXT NOT NULL,
  pre_send BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_invoice_seq ON messages(invoice_id, seq);

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  ops JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'open', -- 'open' | 'accepted' | 'declined' | 'expired'
  decided_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'seller' | 'firm'
  email TEXT NOT NULL,
  invite_token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_participants_hash ON participants(invite_token_hash);

CREATE TABLE IF NOT EXISTS paypal_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'create' | 'send' | 'update' | 'cancel'
  payload JSONB NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paypal_outbox_due ON paypal_outbox(state, next_attempt_at);

CREATE TABLE IF NOT EXISTS paypal_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NULL REFERENCES invoices(id) ON DELETE SET NULL,
  message_id UUID NULL REFERENCES messages(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  latency_ms INT NOT NULL,
  ok BOOLEAN NOT NULL,
  error TEXT NULL,
  ops JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

