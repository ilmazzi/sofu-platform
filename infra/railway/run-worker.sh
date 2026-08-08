#!/bin/sh
set -eu

exec php artisan queue:work redis --sleep=3 --tries=3 --timeout=120
