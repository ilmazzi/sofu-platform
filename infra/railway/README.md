# Railway deploy

Use one Railway project with these services:

- `web`: public entrypoint for the React SPA and same-origin proxy to Laravel.
- `api`: Laravel HTTP API.
- `worker`: Laravel queue worker.
- `scheduler`: Laravel scheduler.
- `Postgres`: Railway managed PostgreSQL.
- `Redis`: Railway managed Redis.

This keeps browser traffic on one public domain (`web`) while backend processes stay separate.

## 1. Create services

In Railway Dashboard:

1. Create a new project from the GitHub repository.
2. Add a PostgreSQL service.
3. Add a Redis service.
4. Add four services from the same repo: `web`, `api`, `worker`, `scheduler`.

For each app service, use these settings:

| Service | Dockerfile path | Public domain | Start command |
| --- | --- | --- | --- |
| `web` | `infra/railway/web.Dockerfile` | Yes | default |
| `api` | `infra/railway/api.Dockerfile` | Optional | default |
| `worker` | `infra/railway/api.Dockerfile` | No | `sofu-railway-run-worker` |
| `scheduler` | `infra/railway/api.Dockerfile` | No | `sofu-railway-run-scheduler` |

Set health checks:

- `web`: `/`
- `api`: `/api/v1/health`

## 2. Variables

Create shared variables where possible, then override service-specific values.

### API, worker, scheduler

```env
APP_NAME=Sofu
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:CHANGE_ME
APP_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}

DB_CONNECTION=pgsql
DB_URL=${{Postgres.DATABASE_URL}}
DB_SSLMODE=require

QUEUE_CONNECTION=redis
CACHE_STORE=redis
REDIS_CLIENT=phpredis
REDIS_URL=${{Redis.REDIS_URL}}

SESSION_DRIVER=file
SESSION_DOMAIN=
SANCTUM_STATEFUL_DOMAINS=${{web.RAILWAY_PUBLIC_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}

PAYMENT_PROVIDER=stripe
STRIPE_SECRET=sk_live_CHANGE_ME
STRIPE_WEBHOOK_SECRET=whsec_CHANGE_ME

SIMULATION_ENABLED=false
SOFU_PAYMENT_ATTRITION_BUFFER=0.10
```

For staging/demo, set:

```env
PAYMENT_PROVIDER=mock
```

### Web

Keep `VITE_API_URL` empty so the SPA calls `/api/...` on the same Railway domain and Caddy proxies requests to Laravel.

```env
VITE_API_URL=
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_CHANGE_ME
API_UPSTREAM=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
```

If you disable the public domain on `api`, replace `API_UPSTREAM` with the private Railway URL for the API service.

## 3. First deploy

Deploy order:

1. `Postgres`
2. `Redis`
3. `api`
4. `worker`
5. `scheduler`
6. `web`

After the API deploys, run migrations from the API service shell:

```bash
php artisan migrate --force
```

For staging/demo data only:

```bash
php artisan db:seed --force
```

## 4. Custom domain

Add the production custom domain to the `web` service, not directly to the API.

Then update:

```env
APP_URL=https://your-domain.example
FRONTEND_URL=https://your-domain.example
SANCTUM_STATEFUL_DOMAINS=your-domain.example
CORS_ALLOWED_ORIGINS=https://your-domain.example
```

The browser should use the web domain only. API calls go through `/api` on that same domain.

## 5. Notes

- Do not run `route:cache` until closure routes are converted to controller actions.
- Worker and scheduler do not need public domains.
- Use Railway PostgreSQL backups before going live.
- Keep Stripe live keys only in Railway variables, never in the repo.
