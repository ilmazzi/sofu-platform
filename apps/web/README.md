# Sofu web (SPA)

React + TypeScript + Vite + React Router. Uses `@sofu/contracts` for API types and a **dev proxy** so Sanctum session + CSRF cookies stay on the same origin as the app (`localhost:5173` → Laravel at `http://sofu-platform.test` via Laravel Herd).

**UI:** [Mantine](https://mantine.dev/) v9 (MIT, open source) — senza Tailwind. Stile globale e shell in `MantineProvider` + `AppShell` (`src/main.tsx`, `src/layouts/RootLayout.tsx`); tema base in `src/theme/mantineTheme.ts`. Le singole pagine si possono migrare gradualmente da HTML/`index.css` a componenti Mantine (`Button`, `Card`, `TextInput`, …).

## Prerequisites

- API reachable at **`http://sofu-platform.test`** (e.g. Laravel Herd linked to `apps/api`), with `APP_URL` matching that host in `apps/api/.env`
- API `.env` aligned with the SPA origin, e.g. `FRONTEND_URL=http://localhost:5173` and `SANCTUM_STATEFUL_DOMAINS` including `localhost:5173` (see `apps/api/.env.example`)

## Setup

```bash
cd apps/web
npm install
```

Optional: copy `.env.example` to `.env`. Leave `VITE_API_URL` empty in development so requests use relative URLs and the Vite proxy.

Per **Stripe** in locale: imposta `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…` (Dashboard Stripe → chiavi pubblicabile). L’API usa già `STRIPE_SECRET` / webhook; senza la chiave pubblica il modulo di pagamento non si monta.

## Develop

```bash
npm run dev
```

Open the URL printed by Vite as **`http://localhost:5173`** (not `http://127.0.0.1:5173`). The dev proxy forwards `/api` and `/sanctum` to **`http://sofu-platform.test`**; mixing `127.0.0.1` in the browser with `localhost:5173` cookies can drop session/CSRF cookies and break register/login.

Ensure Herd is serving the API at `http://sofu-platform.test` (or adjust `vite.config.ts` `server.proxy` targets to match your Herd hostname).

## Build

```bash
npm run build
```

Production deployments that call the API on **another origin** need explicit CORS/session configuration; the empty `VITE_API_URL` + proxy setup is aimed at local development.

### `CSRF cookie request failed (500)`

The API failed while starting the session (middleware runs before Sanctum returns the CSRF cookie). Typical fixes in `apps/api/.env`: set **`APP_KEY`** (`php artisan key:generate`), ensure the database is migrated if you use **`SESSION_DRIVER=database`**, or use **`SESSION_DRIVER=file`** for local dev (see `apps/api/.env.example`). Check `apps/api/storage/logs/laravel.log` for the exact exception.
