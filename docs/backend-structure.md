# Backend Structure

The Sofu API is a Laravel modular monolith.

## Module Boundaries

Each module owns its business language and rules:

- Identity
- Campaigns
- Reservations
- Pricing
- Payments
- Ledger
- Notifications
- Backoffice

Cross-module access should happen through application actions, events, or explicit interfaces. Avoid reaching directly into another module's infrastructure layer.

## Layer Responsibilities

### Domain

Pure business concepts:

- entities
- value objects
- domain services
- domain events
- business exceptions

Domain code should not know about HTTP, Laravel requests, queues, or Eloquent.

### Application

Use cases and orchestration:

- commands
- actions
- query handlers
- transaction boundaries
- authorization coordination
- event dispatching

Application code may use framework services intentionally, but should keep business decisions explicit.

### Infrastructure

Adapters and persistence:

- Eloquent models
- repositories
- migrations
- payment provider adapters
- storage adapters
- external API clients

### Http

API transport:

- controllers
- form requests
- resources
- module route file

Controllers should be thin.

## Routing

Global API routes live in `routes/api.php`.

Module routes live in:

```txt
app/Modules/{Module}/Http/routes.php
```

`ModuleServiceProvider` loads module route files under:

```txt
/api/v1
```

## Migrations

Global Laravel migrations still live in `database/migrations`.

Module-owned migrations may live in:

```txt
app/Modules/{Module}/Infrastructure/Database/Migrations
```

`ModuleServiceProvider` loads these automatically.

## First Implementation Order

Build vertical slices in this order:

1. Identity baseline
2. Campaign draft and publication model
3. Pricing value objects and calculator
4. Reservation creation with transaction and idempotency
5. Audit log
6. Payment provider integration
7. Ledger entries
