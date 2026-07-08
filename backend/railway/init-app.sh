#!/bin/bash
set -e
php artisan migrate --force --seed
php artisan config:cache
php artisan route:cache
php artisan view:cache
