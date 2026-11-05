# Architectural Decisions Log

This document records architectural and technical decisions made during the evolution of the PayPal Invoice Chat application, following the requirements in the project specification.

## ADR-001: Strict Minor Units Representation for Money
- **Status**: Accepted
- **Context**: Currency rounding errors and float representation issues can cause invoices to diverge between local state and PayPal's ledger.
- **Decision**: All domain calculations, stored quantities, and monetary values are held in integer minor units (e.g. cents for USD, paise for INR). Conversions to decimal strings (e.g., `"12.50"`) happen exclusively at the PayPal API boundary or UI display layer.

## ADR-002: Modular TypeScript Project Structure
- **Status**: Accepted
- **Context**: The prototype combined HTTP routing, WebSockets, pure calculations, LLM calls, and PayPal network calls in a single `server.js`.
- **Decision**: Restructure into decoupled modules:
  - `src/domain/`: Pure functions, zero I/O, deterministic invoice arithmetic and ops engine.
  - `src/config/`: Strict Zod schema for environment variables and boot validation, logger setup.
  - `src/db/`: Database schema, pool, query helpers, and migration management.
  - `src/auth/`: Seller magic-link tokens, firm invite hashes, session cookies, and authorization policies.
  - `src/realtime/`: WebSocket server, sequence tracking, and pub/sub fanout.
  - `src/paypal/`: Typed PayPal Invoicing v2 SDK with backoff, token caching, and request deduplication.
  - `src/llm/`: Anthropic prompt engine, tool definition, amount parsing, and fallback regex parser.
  - `src/worker/`: Outbox processor, sync assertions, and periodic reconciliation.
  - `src/http/`: Express application, routes, middlewares, webhook receiver.

## ADR-003: Postgres Migrations via Pure SQL / node-pg-migrate
- **Status**: Accepted
- **Context**: Robust version tracking and schema evolution are required for local, Docker, and production deployments.
- **Decision**: Use SQL-based migrations with standard Postgres types (`jsonb`, `bigserial`, foreign keys, check constraints) to ensure database reliability and clear reviewability.

## ADR-004: Test Strategy & Tooling
- **Status**: Accepted
- **Context**: Need fast, reliable unit, integration, property, and end-to-end tests across 11 phases.
- **Decision**:
  - `vitest`: Fast TypeScript test runner with coverage support for unit, domain, and integration tests.
  - `fast-check`: Property-based testing for mathematical invariants of domain arithmetic.
  - `msw`: Network interception for mock PayPal responses in integration tests.
  - `playwright`: Multi-browser, multi-role (seller vs firm) end-to-end testing.

