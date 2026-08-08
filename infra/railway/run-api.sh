#!/bin/sh
set -eu

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8080}"
