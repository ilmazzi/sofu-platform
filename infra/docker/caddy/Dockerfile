FROM node:24-bookworm-slim AS web-builder

WORKDIR /app

ARG VITE_API_URL=
ARG VITE_STRIPE_PUBLISHABLE_KEY=

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}

COPY packages/contracts/package.json packages/contracts/package-lock.json ./packages/contracts/
COPY packages/contracts/openapi ./packages/contracts/openapi
COPY packages/contracts/generated ./packages/contracts/generated

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/

WORKDIR /app/apps/web
RUN npm ci

COPY apps/web ./
RUN npm run build

FROM caddy:2-alpine

COPY infra/docker/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-builder /app/apps/web/dist /srv/www
COPY apps/api/public /var/www/html/public
