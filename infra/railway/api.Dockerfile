FROM php:8.4-apache-bookworm

WORKDIR /var/www/html

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    COMPOSER_ALLOW_SUPERUSER=1 \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        gosu \
        libicu-dev \
        libpq-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install \
        bcmath \
        intl \
        opcache \
        pdo_pgsql \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && a2enmod rewrite headers \
    && sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf \
    && printf '%s\n' '<Directory /var/www/html/public>' '    AllowOverride All' '    Require all granted' '</Directory>' > /etc/apache2/conf-available/sofu-document-root.conf \
    && printf '%s\n' 'ServerName localhost' > /etc/apache2/conf-available/sofu-server-name.conf \
    && a2enconf sofu-document-root \
    && a2enconf sofu-server-name \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --optimize-autoloader \
    --prefer-dist

COPY apps/api ./
COPY infra/railway/api-entrypoint.sh /usr/local/bin/sofu-railway-api-entrypoint
COPY infra/railway/run-worker.sh /usr/local/bin/sofu-railway-run-worker
COPY infra/railway/run-scheduler.sh /usr/local/bin/sofu-railway-run-scheduler

RUN composer dump-autoload \
        --no-interaction \
        --optimize \
    && php artisan package:discover --ansi \
    && sed -i 's/\r$//' \
        /usr/local/bin/sofu-railway-api-entrypoint \
        /usr/local/bin/sofu-railway-run-worker \
        /usr/local/bin/sofu-railway-run-scheduler \
    && chmod +x \
        /usr/local/bin/sofu-railway-api-entrypoint \
        /usr/local/bin/sofu-railway-run-worker \
        /usr/local/bin/sofu-railway-run-scheduler \
    && mkdir -p \
        storage/app/public \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["/usr/local/bin/sofu-railway-api-entrypoint"]
CMD ["apache2-foreground"]
