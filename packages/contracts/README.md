# Contracts

Shared API contracts live here.

Planned structure:

```txt
packages/contracts/
  openapi/
    openapi.yaml
  generated/
    typescript/
```

The backend should be the source of truth for API behavior. The OpenAPI schema should be updated with each API change, and the React frontend should consume generated TypeScript types/client code instead of hand-written API shapes.
