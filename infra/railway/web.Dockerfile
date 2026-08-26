FROM node:24-bookworm-slim AS web-builder

WORKDIR /app

ARG VITE_API_URL=
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ARG VITE_LANDING_VIDEO_URL=

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY} \
    VITE_LANDING_VIDEO_URL=${VITE_LANDING_VIDEO_URL}

# Fail fast if Stripe publishable key is missing or still the README placeholder.
RUN if [ -z "$VITE_STRIPE_PUBLISHABLE_KEY" ] || \
       [ "$VITE_STRIPE_PUBLISHABLE_KEY" = "pk_test_CHANGE_ME" ] || \
       [ "$VITE_STRIPE_PUBLISHABLE_KEY" = "pk_test_REPLACE_ME" ]; then \
      echo "ERROR: set a real VITE_STRIPE_PUBLISHABLE_KEY on the web service (Dashboard Stripe → Publishable key), then redeploy." >&2; \
      exit 1; \
    fi

COPY packages/contracts/package.json packages/contracts/package-lock.json ./packages/contracts/
COPY packages/contracts/openapi ./packages/contracts/openapi
COPY packages/contracts/generated ./packages/contracts/generated

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/

WORKDIR /app/apps/web
RUN npm ci

COPY apps/web ./
RUN npm run build

FROM caddy:2-alpine

ENV API_UPSTREAM=http://api:8080

COPY infra/railway/web.Caddyfile /etc/caddy/Caddyfile
COPY --from=web-builder /app/apps/web/dist /srv/www
