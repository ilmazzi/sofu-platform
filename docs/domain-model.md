# Sofu Domain Model

## Product Definition

Sofu helps creators launch campaigns where supporters join as a group. The more supporters join, the lower the final price becomes for everyone, within defined minimum and maximum bounds.

The real product should treat a support action as a reservation first. Payment can be authorized, captured, or finalized according to the chosen payment model, but the business language should distinguish reservations from donations.

## Main Actors

### Guest

Can browse public campaigns and start registration.

### Supporter

Can reserve spots in campaigns, view reservation history, receive price updates, and complete required payment flows.

### Creator

Can create and manage campaigns, provide cost breakdowns, track supporters, and receive payouts after successful campaign completion.

### Operator

Internal Sofu team member. Can moderate campaigns, review fraud signals, handle support, and inspect operational data.

### Admin

High-privilege operator with platform configuration and financial permissions.

## Core Entities

### User

Represents an authenticated account.

Important fields:

- id
- email
- password hash or external identity
- display name
- email verification state
- account status
- timestamps

### Campaign

Represents a funding/preorder project.

Important fields:

- id
- creator id
- title
- slug
- description
- category
- status
- currency
- target supporter count
- minimum price
- maximum price
- current price
- activation state
- start date
- end date
- published at
- timestamps

### Campaign Cost Item

Represents an item in the transparent cost breakdown.

Important fields:

- id
- campaign id
- label
- amount in minor units
- sort order

### Reservation

Represents a supporter joining a campaign.

Important fields:

- id
- campaign id
- supporter id
- status
- price quoted at reservation
- current effective price snapshot
- quantity
- idempotency key
- timestamps

Possible statuses:

- pending
- active
- cancelled
- expired
- converted_to_payment
- failed

### Price Snapshot

Represents the price state after a meaningful campaign change.

Important fields:

- id
- campaign id
- supporter count
- calculated price
- minimum price
- maximum price
- reason
- created at

### Payment

Represents a payment attempt or provider object.

Important fields:

- id
- reservation id
- provider
- provider reference
- status
- amount authorized
- amount captured
- currency
- failure reason
- timestamps

### Ledger Entry

Represents an immutable financial movement.

Important fields:

- id
- account
- direction
- amount in minor units
- currency
- source type
- source id
- metadata
- created at

Ledger entries must never be updated in place after creation. Corrections are represented as new entries.

## Campaign Lifecycle

```txt
draft
  -> submitted_for_review
  -> approved
  -> published
  -> activated
  -> successful
  -> closed
```

Alternative terminal states:

```txt
rejected
cancelled
expired
failed
```

## Reservation Lifecycle

```txt
pending
  -> active
  -> converted_to_payment
```

Alternative states:

```txt
pending -> expired
active -> cancelled
converted_to_payment -> failed
```

## Pricing Rule

The effective price is calculated on the backend:

```txt
raw price = total campaign amount / active supporter count
effective price = clamp(raw price, minimum price, maximum price)
```

Open questions to decide before implementation:

- Is `total campaign amount` the sum of cost items plus fees?
- Does the platform guarantee refunds/adjustments when price decreases?
- Is payment authorized at max price and captured at final price?
- Can one supporter reserve multiple quantities?
- Can creators change pricing after publication?

Until these are decided, the implementation should keep pricing isolated in the Pricing module.

## Invariants

- A campaign cannot be published without valid pricing bounds.
- Minimum price must be lower than maximum price.
- Campaign currency cannot change after first reservation.
- Current price is calculated by the backend.
- Reservation creation must be idempotent.
- Reservation count changes must happen inside a database transaction.
- A campaign should not close while payment processing jobs are incomplete.
- Ledger entries are append-only.

## Events

Initial domain events:

- UserRegistered
- CampaignCreated
- CampaignSubmittedForReview
- CampaignPublished
- ReservationCreated
- ReservationCancelled
- CampaignPriceChanged
- CampaignActivated
- CampaignClosed
- PaymentAuthorized
- PaymentCaptured
- PaymentFailed
- LedgerEntryRecorded

Events can start as Laravel events. They do not need to be a distributed event bus in the first version.
