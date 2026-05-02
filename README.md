# Sofu Platform

Production codebase for Sofu.

Sofu is organized as a monorepo:

```txt
apps/
  api/       Laravel API
  web/       React TypeScript SPA
packages/
  contracts/ OpenAPI schema and generated clients
docs/        Architecture, domain, security, and API decisions
infra/       Local and deployment infrastructure
```

## Backend

The Laravel API lives in `apps/api`.

Useful commands:

```bash
cd apps/api
composer install
php artisan test
php artisan route:list
vendor/bin/pint --test
```

## Architecture

Start here:

- `docs/architecture.md`
- `docs/domain-model.md`
- `docs/security.md`
- `docs/api-guidelines.md`

The backend uses a modular monolith layout under `apps/api/app/Modules`.
