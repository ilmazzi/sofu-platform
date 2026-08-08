#!/bin/sh
set -eu

: "${PORT:=8080}"

mkdir -p \
  storage/app/public \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  bootstrap/cache

chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

if [ "${APP_ENV:-production}" = "production" ]; then
  php artisan config:cache --no-ansi
  php artisan view:cache --no-ansi
fi

if [ "$(id -u)" = "0" ] && [ "${1:-}" = "php" ] && [ "${2:-}" = "artisan" ]; then
  exec gosu www-data "$@"
fi

exec "$@"
