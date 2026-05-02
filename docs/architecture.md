# Sofu Platform Architecture

## Goal

Sofu is a community funding platform where supporters reserve a place in a campaign and the final price decreases as more people join. The production system must be secure, auditable, scalable, and maintainable without becoming prematurely distributed.

## Architecture Choice

Sofu starts as an API-first modular monolith:

- Laravel powers the backend API.
- React and TypeScript power the web frontend.
- PostgreSQL is the primary database.
- Redis is used for queues, cache, locks, and rate limiting.
- OpenAPI defines the contract between backend and frontend.
- Background work runs through Laravel queues and Horizon.

This gives us strong internal boundaries while keeping development fast. Services can be extracted later if a module has a clear scaling or ownership reason.

## Repository Layout

```txt
sofu-platform/
  apps/
    api/              Laravel API
    web/              React TypeScript SPA
  packages/
    contracts/        OpenAPI schema and generated clients/types
  docs/
    architecture.md
    domain-model.md
    security.md
    api-guidelines.md
  infra/
    docker/
    deploy/
```

## Backend Module Layout

Laravel code should be organized by business capability, not by technical type alone.

```txt
apps/api/app/
  Modules/
    Identity/
      Domain/
      Application/
      Infrastructure/
      Http/
    Campaigns/
    Reservations/
    Pricing/
    Payments/
    Ledger/
    Notifications/
    Backoffice/
  Support/
```

Each module owns its domain rules. Controllers should validate input, call application actions, and return resources. They should not contain business decisions.

## Core Modules

### Identity

Owns users, authentication, profiles, roles, permissions, organizations, and account security.

### Campaigns

Owns campaign creation, drafts, moderation, publication, lifecycle state, campaign pages, media, and creator-facing management.

### Reservations

Owns supporter reservations, reservation status, supporter metadata, cancellation rules, concurrency control, and supporter-facing history.

### Pricing

Owns price calculation, price floors and ceilings, price snapshots, campaign activation thresholds, and pricing auditability.

### Payments

Owns payment provider integration, payment intents, mandates, webhooks, payment failures, refunds, and provider-specific state.

### Ledger

Owns financial records, platform fees, provider fees, campaign balances, creator payouts, and immutable accounting entries.

### Notifications

Owns email, in-app notifications, transactional messages, reminders, and asynchronous communication.

### Backoffice

Owns internal operations: moderation, support tools, fraud review, finance views, and platform administration.

## Request Flow

Typical reservation flow:

```txt
React SPA
  -> POST /api/v1/campaigns/{campaign}/reservations
  -> Laravel controller
  -> Form request validation
  -> ReserveCampaignSpot action
  -> database transaction and lock
  -> domain events
  -> API resource response
  -> queued notifications/audit
```

## Data Principles

- Money is stored as integers in minor currency units, for example cents.
- User-supplied prices are never trusted.
- Derived counters may exist for speed, but the source of truth must remain reconstructable.
- Important business changes must be auditable.
- External provider events must be idempotent.
- Campaign pricing must be explainable from stored inputs and snapshots.

## Scaling Principles

- Start with one Laravel app and strong module boundaries.
- Use queues for slow or external work.
- Use Redis locks for high-contention campaign updates.
- Add read models only where query pressure requires them.
- Extract services only after clear evidence, not as a default.

## Deployment Shape

Initial production deployment:

- Web SPA deployed to CDN/static hosting.
- Laravel API deployed as stateless application containers.
- Queue workers deployed separately from API containers.
- PostgreSQL managed database.
- Redis managed cache/queue/lock store.
- S3-compatible object storage for media.
- Centralized logs, metrics, and error tracking.

## Non-Goals For The First Production Version

- No microservices.
- No event sourcing for the full system.
- No GraphQL unless a real frontend or partner need appears.
- No payment logic in the frontend.
- No admin access without explicit authorization policies.
