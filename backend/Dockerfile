# URS backend — self-contained demo/production image.
#
# Kept deliberately simple and predictable: PHP 8.3 + the extensions the app
# needs, then Laravel's built-in server behind the Caddy reverse proxy defined
# in the root docker-compose.yml. This is sized for a low-traffic client demo,
# not high concurrency.
FROM php:8.3-cli-bookworm

# install-php-extensions handles the fiddly build deps for gd/intl/zip.
# NOTE: gd must support truecolor for the invoice QR code and company logo to
# render in generated PDFs (see PROJECT_MAP.md — palette PNGs come out blank).
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/
RUN chmod +x /usr/local/bin/install-php-extensions \
    && install-php-extensions gd intl bcmath pdo_mysql zip exif pcntl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Install PHP dependencies first for better layer caching.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist

# Then bring in the rest of the application code.
COPY . .
RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && chmod +x /var/www/html/docker/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/var/www/html/docker/entrypoint.sh"]
