# Sofu Security Baseline

## Security Goals

Sofu handles identity, campaign trust, financial flows, and supporter data. The platform must be designed assuming real abuse attempts: spam, fake campaigns, payment tampering, webhook replay, privilege escalation, and race conditions around price changes.

Security is not a final checklist. It is part of each feature definition.

## Authentication

Use Laravel Sanctum for the first-party React SPA.

Baseline requirements:

- HttpOnly secure cookies for authenticated browser sessions.
- CSRF protection for state-changing browser requests.
- Email verification before sensitive actions.
- Password reset with short-lived signed tokens.
- Optional two-factor authentication for creators and operators.
- Strict session invalidation after password changes.

OAuth2 should be introduced only if Sofu needs third-party API clients.

## Authorization

Every sensitive action must pass through Laravel policies or gates.

Required authorization boundaries:

- Supporters can only access their own reservations.
- Creators can only manage campaigns they own.
- Operators can access moderation tools according to role.
- Admin-only finance operations require explicit permissions.
- Backoffice routes must never be public.

Roles should not be checked with scattered string comparisons in controllers.

## Input Validation

Use Form Request classes for all API mutations.

Rules:

- Validate all request fields.
- Reject unknown or unexpected fields where practical.
- Never trust price, campaign state, user id, role, or fee values from the frontend.
- Normalize emails and identifiers consistently.
- Use server-side validation for file uploads and image URLs.

## Financial Safety

Money rules:

- Store money as integer minor units.
- Store currency explicitly.
- Do not use floats for money.
- Payment provider webhook handling must be idempotent.
- Payment requests must use server-generated amounts.
- Ledger entries must be append-only.
- Reconciliation should compare provider data with internal records.

## Reservation Safety

Reservation creation must be concurrency-safe.

Required controls:

- Database transaction around reservation creation and campaign counter updates.
- Row-level lock or Redis lock for campaign price/counter changes.
- Idempotency key for reservation creation.
- Rate limiting per account, IP, campaign, and email where appropriate.
- Audit record for each reservation state transition.

## Webhook Safety

Webhook endpoints must:

- Verify provider signatures.
- Reject stale timestamps when supported by the provider.
- Store provider event ids.
- Process duplicate events safely.
- Avoid doing slow work inline.
- Return success only after the event is durably recorded.

## Audit Logging

Audit logs should capture:

- actor id
- actor type
- action
- target type
- target id
- request id
- IP address
- user agent
- before/after metadata when safe
- timestamp

Audit logs are required for:

- authentication events
- role and permission changes
- campaign publication and moderation
- reservation creation/cancellation
- payment state changes
- payout and ledger actions
- backoffice access to sensitive records

## Rate Limiting

Apply rate limits to:

- login
- password reset
- registration
- reservation creation
- comments/messages
- campaign creation
- webhook endpoints
- public search endpoints

Limits should be strict enough to slow abuse, but not so strict that normal campaigns break during traffic spikes.

## Data Privacy

Principles:

- Collect only data needed for the product.
- Hide supporter email addresses from creators unless there is a clear product/legal basis.
- Avoid exposing internal ids when slugs or public ids are better.
- Keep sensitive operational notes out of public API resources.
- Define data retention rules before launch.

## Operational Security

Production requirements:

- HTTPS everywhere.
- Secure headers.
- Secrets stored outside git.
- Separate production, staging, and local credentials.
- Backups tested regularly.
- Error tracking enabled.
- Centralized logs with request ids.
- Dependency updates reviewed regularly.
- CI runs tests and static checks before deployment.

## Minimum Launch Checklist

- Auth and authorization covered by tests.
- Reservation flow covered by race-condition tests.
- Payment webhook idempotency tested.
- Backoffice protected by policies.
- Secrets absent from git history.
- Security headers configured.
- Rate limits configured.
- Audit logs implemented for critical actions.
- Backups and restore process verified.
