#!/bin/sh
# Applies pending database migrations, then starts the app.
# Set SKIP_MIGRATIONS=true to start without migrating (e.g. a second replica).
set -e

if [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Applying database migrations..."
  tries=0
  until /opt/prisma/node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma; do
    tries=$((tries + 1))
    if [ "$tries" -ge 10 ]; then
      echo "Database still not reachable after $tries attempts, giving up." >&2
      exit 1
    fi
    echo "Database not ready, retrying in 3s ($tries/10)..."
    sleep 3
  done
fi

exec "$@"
