#!/usr/bin/env sh
# Boots the URS backend inside the container:
#   1. ensures the storage dirs exist (they live on a mounted volume that may
#      start empty),
#   2. keeps a stable APP_KEY on that volume so login tokens survive restarts,
#   3. waits for MySQL, runs migrations (idempotent),
#   4. seeds the demo data exactly once — after that, whatever the client
#      enters is preserved across restarts and redeploys.
set -e
cd /var/www/html

mkdir -p \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/app/private \
  storage/app/public \
  bootstrap/cache
chmod -R ug+rw storage bootstrap/cache || true

# Stable APP_KEY persisted on the storage volume (only generated if one wasn't
# supplied via the environment).
if [ -z "${APP_KEY}" ]; then
  if [ ! -f storage/app/.appkey ]; then
    php artisan key:generate --show > storage/app/.appkey
  fi
  APP_KEY="$(cat storage/app/.appkey)"
  export APP_KEY
fi

# Wait for the database to accept connections, then migrate. migrate is safe to
# retry, so we just loop on it until it succeeds.
i=1
while [ "$i" -le 40 ]; do
  if php artisan migrate --force; then
    break
  fi
  echo "waiting for database... ($i)"
  i=$((i + 1))
  sleep 3
done

# Seed once; the marker file lives on the persistent volume.
if [ ! -f storage/app/.seeded ]; then
  php artisan db:seed --force && touch storage/app/.seeded
fi

php artisan storage:link || true

exec php artisan serve --host=0.0.0.0 --port=8000
