# Docker production deploy

This setup targets a single VPS with Docker Compose and Caddy:

- `caddy`: HTTPS, static React app, and proxy to Laravel.
- `api`: Laravel PHP-FPM.
- `worker`: Laravel queue worker.
- `scheduler`: Laravel scheduler.
- `postgres`: PostgreSQL for a self-contained VPS deploy.
- `redis`: queues, cache, locks, and rate limiting.

## First deploy

From the repository root on the server:

```bash
cp infra/docker/.env.example .env
```

Edit `.env` before starting:

- Set `SOFU_DOMAIN` to the public host, without scheme.
- Set `CADDY_EMAIL` to a real email for Let's Encrypt.
- Generate and set `APP_KEY`.
- Change `DB_PASSWORD`.
- Set Stripe keys when `PAYMENT_PROVIDER=stripe`.
- Keep `VITE_API_URL` empty when API and SPA share the same domain through Caddy.

Generate an app key with the Docker image:

```bash
docker compose build api
docker compose run --rm -e APP_ENV=local api php artisan key:generate --show
```

Copy the printed value into `.env` as `APP_KEY`.

Build and start:

```bash
docker compose up -d --build
```

Run migrations explicitly:

```bash
docker compose run --rm api php artisan migrate --force
```

Check the deployment:

```bash
docker compose ps
docker compose logs -f caddy api worker scheduler
```

The health endpoint is available at:

```txt
https://your-domain.example/up
```

## Routine commands

Rebuild after code changes:

```bash
docker compose up -d --build
```

Run migrations after deploy:

```bash
docker compose run --rm api php artisan migrate --force
```

Run an Artisan command:

```bash
docker compose run --rm api php artisan about
```

Read logs:

```bash
docker compose logs -f api
docker compose logs -f worker
docker compose logs -f scheduler
```

Restart the queue worker:

```bash
docker compose restart worker
```

## Backups

If PostgreSQL runs inside Compose, back up the `postgres_data` volume regularly.
Example logical backup:

```bash
docker compose exec postgres pg_dump -U "$DB_USERNAME" "$DB_DATABASE" > sofu_backup.sql
```

For production, store backups outside the VPS as well.

## Managed PostgreSQL or Redis

The default Compose file starts local `postgres` and `redis` services, which is useful for a simple VPS.

If the hosting provider offers managed PostgreSQL or Redis:

1. Set `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` to the provider values.
2. Set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` if Redis is managed.
3. Keep `QUEUE_CONNECTION=redis` and `CACHE_STORE=redis`.
4. Add a small Compose override to remove local `postgres` / `redis` and their `depends_on` entries once the hosting target is known.

Do not bake secrets into Docker images. Keep them in the server `.env` or in the hosting secret manager.

## Notes

- Caddy handles TLS certificates automatically for public domains.
- Laravel migrations are not run automatically on container boot. Run them deliberately after deployment.
- `worker` and `scheduler` use the same application image as `api`, so code and configuration stay consistent.
- `PAYMENT_PROVIDER=mock` is acceptable only for demo/staging. Real production payments should use Stripe keys.
