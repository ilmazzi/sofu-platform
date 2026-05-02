# Contracts

Shared API contract for the Sofu platform: **OpenAPI 3** description of the Laravel API (`apps/api`) and **generated TypeScript types** for consumers (for example the future `apps/web` SPA).

## Layout

```txt
packages/contracts/
  openapi/
    openapi.yaml    # source contract (edit when the API changes)
  generated/
    typescript/
      api.d.ts      # generated — run `npm run generate` after editing the YAML
  package.json
```

The backend remains the source of truth for behavior. When you add or change routes, request bodies, or JSON shapes, update `openapi/openapi.yaml` and regenerate types.

## Generate TypeScript types

```bash
cd packages/contracts
npm install
npm run generate
```

This uses [openapi-typescript](https://github.com/openapi-ts/openapi-typescript) and writes `generated/typescript/api.d.ts`.

## Use from a TypeScript package

Add a dependency (example for a future app at `apps/web`):

```json
{
  "dependencies": {
    "@sofu/contracts": "file:../../packages/contracts"
  }
}
```

Then import the generated types:

```ts
import type { paths } from "@sofu/contracts";

type MeResponse = paths["/api/v1/me"]["get"]["responses"][200]["content"]["application/json"];
```

For HTTP calls, pair these types with `fetch`, [openapi-fetch](https://github.com/openapi-ts/openapi-fetch), or another client; the repo does not yet generate a full request client.

## SPA authentication notes

Stateful Sanctum routes expect a **session cookie** and, for `POST`/`PUT`/etc., a valid **CSRF** flow (`GET /sanctum/csrf-cookie` then `X-XSRF-TOKEN` + cookies). See `apps/api` Sanctum and CORS configuration. The OpenAPI `session` security scheme documents the session cookie by its default name (`laravel_session`); the real cookie name may differ if `SESSION_COOKIE` is set.
