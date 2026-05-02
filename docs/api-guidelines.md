# Sofu API Guidelines

## API Style

Sofu uses a JSON REST API for the React SPA and future clients.

Base path:

```txt
/api/v1
```

The API should be documented with OpenAPI. TypeScript clients and request/response types should be generated from the OpenAPI contract in `packages/contracts`.

## General Rules

- Use JSON request and response bodies.
- Use resource-oriented URLs.
- Use plural nouns for collections.
- Keep business actions explicit when CRUD is not enough.
- Return stable response shapes.
- Do not leak database internals.
- Do not expose sensitive fields by default.

## Example Resources

```txt
GET    /api/v1/campaigns
POST   /api/v1/campaigns
GET    /api/v1/campaigns/{campaign}
PATCH  /api/v1/campaigns/{campaign}
POST   /api/v1/campaigns/{campaign}/submit-for-review
POST   /api/v1/campaigns/{campaign}/publish

GET    /api/v1/campaigns/{campaign}/reservations
POST   /api/v1/campaigns/{campaign}/reservations
GET    /api/v1/reservations/{reservation}
POST   /api/v1/reservations/{reservation}/cancel

GET    /api/v1/me
GET    /api/v1/me/reservations
```

## HTTP Status Codes

Use:

- `200` for successful reads and updates with a response body.
- `201` for successful creation.
- `202` when work has been accepted for async processing.
- `204` for successful operations with no response body.
- `400` for malformed requests.
- `401` for unauthenticated requests.
- `403` for authenticated but unauthorized requests.
- `404` for missing resources or intentionally hidden resources.
- `409` for state conflicts or idempotency conflicts.
- `422` for validation errors.
- `429` for rate limits.
- `500` only for unexpected server errors.

## Response Envelope

Use plain resource responses for single resources:

```json
{
  "id": "cmp_123",
  "type": "campaign",
  "title": "Community Solar Lab",
  "status": "published"
}
```

Use metadata for paginated collections:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 0
  }
}
```

## Error Format

Use a consistent error shape:

```json
{
  "error": {
    "code": "reservation_conflict",
    "message": "This reservation could not be completed.",
    "request_id": "req_123"
  }
}
```

Validation errors:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The given data was invalid.",
    "fields": {
      "email": ["The email field is required."]
    },
    "request_id": "req_123"
  }
}
```

## Idempotency

State-changing payment and reservation endpoints should support idempotency.

Header:

```txt
Idempotency-Key: <client-generated-key>
```

Rules:

- Same user, same endpoint, same key should return the original result.
- Same key with a different payload should return `409`.
- Keys should expire after a defined retention period.

## Pagination

Default pagination:

```txt
?page=1&per_page=20
```

Rules:

- Maximum `per_page` should be enforced.
- Public lists should default to conservative page sizes.
- Cursor pagination can be introduced for high-volume feeds.

## Filtering And Sorting

Use explicit query parameters:

```txt
GET /api/v1/campaigns?status=published&category=education&sort=-published_at
```

Do not expose arbitrary SQL field sorting.

## Versioning

Start with `/api/v1`. Breaking changes require a new version or a compatibility period.

Internal implementation modules can change freely, but public API contracts must remain stable.

## Frontend Contract

The frontend should not hand-write API types when a generated type exists.

Expected flow:

```txt
Laravel API/OpenAPI source
  -> packages/contracts/openapi.yaml
  -> generated TypeScript client
  -> apps/web uses generated client
```

## Security Requirements

- Authenticated browser API uses cookie session auth.
- All state-changing requests require CSRF protection.
- Sensitive resources require policies.
- Rate-limited endpoints must return `429`.
- Public API responses must not include private emails, internal notes, payment provider objects, or raw ledger metadata.
