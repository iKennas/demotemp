#!/usr/bin/env bash
# Paste this into Forge's site "Deploy Script" editor (Site > Application > Deploy Script).
# Forge runs this after every push to the deploy branch. It substitutes
# $FORGE_SITE_BRANCH, $FORGE_PHP, $FORGE_COMPOSER, $FORGE_PHP_FPM automatically.

cd /home/forge/{{ SITE_DOMAIN }}/backend

git pull origin $FORGE_SITE_BRANCH

$FORGE_COMPOSER install --no-dev --no-interaction --prefer-dist --optimize-autoloader

# Reload PHP-FPM so opcache picks up the new code (locked to avoid races
# if two deploys somehow overlap).
( flock -w 10 9 || exit 1
    echo 'Restarting FPM...'; sudo -S service $FORGE_PHP_FPM reload ) 9>/tmp/fpmlock

if [ -f artisan ]; then
    $FORGE_PHP artisan migrate --force
    $FORGE_PHP artisan config:cache
    $FORGE_PHP artisan route:cache
    $FORGE_PHP artisan view:cache
    $FORGE_PHP artisan queue:restart
fi
